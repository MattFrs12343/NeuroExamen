<?php
/**
 * Firma digital de PDFs (PAdES) con el certificado .pfx del médico.
 *
 * Requiere TCPDF instalado vía Composer (composer require tecnickcom/tcpdf)
 * y las variables de entorno CERT_PFX_PATH / CERT_PFX_PASSWORD (ver
 * .env.example). El .pfx NUNCA vive en el repositorio — se copia a mano al
 * servidor, a la carpeta indicada por CERT_PFX_PATH (relativa a server-php/),
 * que debe estar protegida por un .htaccess deny-all (ver config/.htaccess).
 */
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Resuelve la ruta absoluta del certificado y su contraseña desde .env.
 * Fail-closed: si falta cualquiera de las dos, corta la respuesta acá mismo
 * (mismo patrón que getDB() en config/database.php para DB_HOST/DB_USER).
 */
function loadSigningCert(): array {
    $relPath  = $_ENV['CERT_PFX_PATH']     ?? null;
    $password = $_ENV['CERT_PFX_PASSWORD'] ?? null;

    if (!$relPath || !$password) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Certificado de firma digital no configurado en el servidor.']);
        exit;
    }

    $fullPath = __DIR__ . '/../' . $relPath;
    if (!file_exists($fullPath)) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Archivo de certificado de firma no encontrado.']);
        exit;
    }

    return ['path' => $fullPath, 'password' => $password];
}

/**
 * Lee el .pfx UNA sola vez y devuelve todo lo que hace falta para firmar de
 * verdad: certificado y clave privada en archivos PEM temporales (lo único
 * que openssl_pkcs7_sign() sabe leer), la cadena de certificados
 * intermedios, y el titular REAL del certificado (Subject CN) para que el
 * texto "assinado digitalmente por..." diga exactamente eso — nunca un
 * nombre escrito a mano en el formulario del atestado, que podría no
 * coincidir con quien realmente firmó.
 *
 * IMPORTANTE: pese a lo que sugiere el parámetro $cert_type=2 de
 * setSignature(), TCPDF (esta versión) NO sabe leer PKCS12/.pfx
 * directamente — ese parámetro son en realidad los permisos de edición del
 * documento firmado (ver el docblock de setSignature() en tcpdf.php), no
 * el formato del certificado. Pasarle el .pfx crudo hacía que
 * openssl_pkcs7_sign() fallara puertas adentro ("Error getting private
 * key") SIN cortar la ejecución: el PDF se descargaba con el texto de
 * "assinado digitalmente" pero sin firma criptográfica válida. Por eso acá
 * se extraen cert/clave a PEM — el formato que openssl_pkcs7_sign() sí
 * entiende — antes de firmar.
 *
 * Los certificados ICP-Brasil codifican el CN como "RAZÃO SOCIAL:CNPJ"
 * (pessoa jurídica, e-CNPJ) o "NOME:CPF" (pessoa física, e-CPF); acá se
 * separan y el documento se formatea con máscara.
 */
function readSigningCertificate(array $cert): array {
    $pfxData = @file_get_contents($cert['path']);
    if ($pfxData === false) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'No se pudo leer el arquivo do certificado de firma.']);
        exit;
    }

    $parsed = [];
    if (!openssl_pkcs12_read($pfxData, $parsed, $cert['password'])) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Não foi possível abrir o certificado (senha incorreta ou arquivo inválido).']);
        exit;
    }

    $tmpDir   = sys_get_temp_dir();
    $certPath = tempnam($tmpDir, 'sig_cert_');
    $keyPath  = tempnam($tmpDir, 'sig_key_');
    file_put_contents($certPath, $parsed['cert']);
    file_put_contents($keyPath, $parsed['pkey']);
    @chmod($certPath, 0600);
    @chmod($keyPath, 0600);

    $chainPath = null;
    if (!empty($parsed['extracerts'])) {
        $chainPath = tempnam($tmpDir, 'sig_chain_');
        file_put_contents($chainPath, implode("\n", $parsed['extracerts']));
        @chmod($chainPath, 0600);
    }

    // Los PEM temporales contienen la clave privada en claro — se borran
    // solos apenas termina el request, pase lo que pase (incluido un exit
    // temprano en algún error más adelante).
    register_shutdown_function(function () use ($certPath, $keyPath, $chainPath) {
        @unlink($certPath);
        @unlink($keyPath);
        if ($chainPath) { @unlink($chainPath); }
    });

    $x509 = openssl_x509_parse($parsed['cert']);
    $cn   = $x509['subject']['CN'] ?? null;

    $name = $cn; $document = null; $documentLabel = null;
    if ($cn && str_contains($cn, ':')) {
        [$name, $digits] = explode(':', $cn, 2);
        $name   = trim($name);
        $digits = preg_replace('/\D/', '', $digits);

        if (strlen($digits) === 14) {
            $document      = preg_replace('/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/', '$1.$2.$3/$4-$5', $digits);
            $documentLabel = 'CNPJ';
        } elseif (strlen($digits) === 11) {
            $document      = preg_replace('/(\d{3})(\d{3})(\d{3})(\d{2})/', '$1.$2.$3-$4', $digits);
            $documentLabel = 'CPF';
        }
    }

    return [
        'certPath'      => $certPath,
        'keyPath'       => $keyPath,
        'chainPath'     => $chainPath,
        'name'          => $name,
        'document'      => $document,
        'documentLabel' => $documentLabel,
    ];
}

/**
 * Genera un código de verificación público (6 caracteres, sin O/0/I/1 para
 * no confundir al transcribirlo a mano) y lo devuelve ya único dentro de
 * $table — reintenta si choca con uno existente. Este token es lo que
 * identifica al documento en /api/verificar/{token}: es un dato real que
 * vive en la base, no un adorno.
 */
function generateVerificationToken(PDO $pdo, string $table): string {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
        $token = '';
        for ($i = 0; $i < 6; $i++) {
            $token .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        $stmt = $pdo->prepare("SELECT 1 FROM `$table` WHERE token = ?");
        $stmt->execute([$token]);
    } while ($stmt->fetch());

    return $token;
}

/**
 * Código de acceso de 4 dígitos, solo para que el mensaje de WhatsApp se
 * vea igual al de Mevo ("Código de acesso: 8374") — no protege nada por sí
 * solo (la verificación real es por token en la URL), es puramente
 * cosmético/de familiaridad para el paciente.
 */
function generateAccessCode(): string {
    return str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
}

/**
 * Arma la URL base de la API (esquema+host+ruta hasta "/api") a partir del
 * REQUEST_URI actual, sin asumir qué endpoint la llamó — busca el
 * separador literal "/api/" en la ruta, que existe siempre (en local
 * "/neuro-api/api/...", en producción "/api/..."), y corta ahí. Reemplaza
 * el enfoque anterior (recortar el sufijo "/{table}/{id}/signed-pdf" con
 * regex), que solo funcionaba si esta función se llamaba desde
 * signed-pdf.php — ahora también la llaman los POST de creación.
 */
function resolveApiBase(): string {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $isHttps ? 'https' : 'http';
    $path   = preg_replace('#\?.*$#', '', $_SERVER['REQUEST_URI']);
    $pos    = strpos($path, '/api/');
    $apiPath = $pos !== false ? substr($path, 0, $pos + 4) : '/api';
    return $scheme . '://' . $_SERVER['HTTP_HOST'] . $apiPath;
}

/**
 * Genera (si hace falta) y persiste el token de verificación pública de UN
 * documento, y devuelve la URL completa a /api/verificar/{kind}/{token} —
 * compartido por los signed-pdf.php de Atestados, Recetas, Pedidos,
 * Encaminhamentos y Fórmulas Infantis para no repetir cinco veces la misma
 * detección de HTTPS/host y el UPDATE. $row viene por referencia: si no
 * tenía token, se le agregan 'token'/'validation_url'/'qr_content' en
 * memoria (además de guardarlos en la base) para que el resto del script
 * los use sin tener que releer la fila.
 *
 * $signedAtColumn es opcional: algunas tablas (atestados) tienen su propia
 * columna `signed_at` que conviene fijar la primera vez que se firma; las
 * que no la tienen (recetas, orders, encaminhamentos, formula_leite) usan
 * null acá y la fecha de firma que se imprime sale de otro campo (`date`,
 * etc.), no de esta columna.
 */
function resolveVerificationUrl(PDO $pdo, string $table, string $kind, string $id, array &$row, ?string $signedAtColumn = null): string {
    if (!empty($row['token'])) {
        // Documentos creados antes de que existiera el código de acceso
        // tienen token pero no access_code — se completa acá, una sola vez.
        if (empty($row['access_code'])) {
            $accessCode = generateAccessCode();
            $pdo->prepare("UPDATE `$table` SET access_code = ? WHERE id = ?")->execute([$accessCode, $id]);
            $row['access_code'] = $accessCode;
        }
        return $row['qr_content'] ?: $row['validation_url'];
    }

    $apiBase   = resolveApiBase();
    $token       = generateVerificationToken($pdo, $table);
    $accessCode  = generateAccessCode();
    $verifyUrl = rtrim($apiBase, '/') . '/verificar/' . $kind . '/' . $token;

    if ($signedAtColumn) {
        $sql = "UPDATE `$table` SET token = ?, access_code = ?, validation_url = ?, qr_content = ?, `$signedAtColumn` = COALESCE(`$signedAtColumn`, ?) WHERE id = ?";
        $pdo->prepare($sql)->execute([$token, $accessCode, $verifyUrl, $verifyUrl, date('d/m/Y H:i:s'), $id]);
    } else {
        $sql = "UPDATE `$table` SET token = ?, access_code = ?, validation_url = ?, qr_content = ? WHERE id = ?";
        $pdo->prepare($sql)->execute([$token, $accessCode, $verifyUrl, $verifyUrl, $id]);
    }

    $row['token']          = $token;
    $row['access_code']    = $accessCode;
    $row['validation_url'] = $verifyUrl;
    $row['qr_content']     = $verifyUrl;

    return $verifyUrl;
}

/**
 * Genera y persiste token+access_code+validation_url para un documento
 * RECIÉN CREADO (POST), sin esperar a que se firme — así el link de
 * WhatsApp está disponible de entrada para cualquier documento, no solo
 * los firmados. $kind es el segmento de URL usado en /api/verificar/{kind}
 * (ver $DOCUMENT_KINDS en api/verificar/index.php); $table es la tabla SQL.
 * Devuelve [token, accessCode, validationUrl] para incluir en la respuesta
 * del POST sin tener que releer la fila.
 */
function generateVerificationInfo(PDO $pdo, string $table, string $kind, string $id): array {
    $apiBase    = resolveApiBase();
    $token      = generateVerificationToken($pdo, $table);
    $accessCode = generateAccessCode();
    $verifyUrl  = rtrim($apiBase, '/') . '/verificar/' . $kind . '/' . $token;

    $pdo->prepare("UPDATE `$table` SET token = ?, access_code = ?, validation_url = ?, qr_content = ? WHERE id = ?")
        ->execute([$token, $accessCode, $verifyUrl, $verifyUrl, $id]);

    return ['token' => $token, 'accessCode' => $accessCode, 'validationUrl' => $verifyUrl];
}

/**
 * Recuadro de verificación (QR + token) que va en el encabezado, al lado de
 * los datos del paciente — mismo lugar/estilo que los PDFs de Mevo con los
 * que ya está familiarizado el médico. A diferencia de un QR que apunte
 * directo a validar.iti.gov.br (una herramienta de SUBIDA MANUAL de
 * archivo: no muestra nada si sólo se visita la URL), este QR apunta a
 * $verifyUrl — una página propia (ver api/verificar/index.php) que
 * consulta el token en la base de datos y muestra al instante los datos
 * reales del documento. Quien escanea el QR ve una confirmación real, sin
 * tener que subir el archivo a ningún lado; ahí mismo se lo invita,
 * además, a hacer la verificación criptográfica completa en el sitio
 * oficial del ITI para quien quiera ese nivel extra de certeza.
 * Devuelve el Y final (mm) alcanzado por la tarjeta.
 */
function drawQrVerificationBox(TCPDF $pdf, float $x, float $y, float $w, string $verifyUrl, string $token, ?string $accessCode = null): float {
    $pad    = 3.5;
    $innerW = $w - 2 * $pad;
    $cardH  = 55;

    $pdf->SetFillColor(247, 250, 252);
    $pdf->SetDrawColor(203, 213, 225);
    $pdf->RoundedRect($x, $y, $w, $cardH, 2.5, '1111', 'DF');

    $curY = $y + $pad + 1.5;
    $pdf->SetFont('freesans', 'B', 7);
    $pdf->SetTextColor(15, 76, 129);
    $pdf->MultiCell($innerW, 0, 'Documento emitido por Juan Marcelo Cabello Merida (CRM 161792 SP)', 0, 'C', false, 1, $x + $pad, $curY);
    $curY = $pdf->GetY() + 1;

    $pdf->SetFont('freesans', '', 5.8);
    $pdf->SetTextColor(100, 116, 139);
    $pdf->MultiCell($innerW, 0, 'Verifique a assinatura digital', 0, 'C', false, 1, $x + $pad, $curY);
    $curY = $pdf->GetY() + 2;

    $qrSize = min(22, $innerW);
    $qrX    = $x + ($w - $qrSize) / 2;
    $pdf->write2DBarcode($verifyUrl, 'QRCODE,H', $qrX, $curY, $qrSize, $qrSize, [], 'N');
    $curY += $qrSize + 2;

    $pdf->SetFont('freesans', 'B', 6.5);
    $pdf->SetTextColor(15, 76, 129);
    $pdf->MultiCell($innerW, 0, 'Código: ' . $token, 0, 'C', false, 1, $x + $pad, $curY);
    $curY = $pdf->GetY() + 1;

    // Código de acesso (4 dígitos) — misma línea que el card del navegador
    // (VerificationQrCard.tsx): quien recibe el papel sin el WhatsApp puede
    // igual abrir la vista del documento en la página de verificación.
    if ($accessCode !== null && trim($accessCode) !== '') {
        $pdf->SetFont('freesans', 'B', 6.5);
        $pdf->SetTextColor(15, 76, 129);
        $pdf->MultiCell($innerW, 0, 'Código de acesso: ' . $accessCode, 0, 'C', false, 1, $x + $pad, $curY);
    }

    // Reset: sin esto, el contenido que se escribe después (el cuerpo del
    // atestado) hereda "negrita" — TCPDF mantiene la fuente activa entre
    // llamadas a writeHTML() salvo que el HTML especifique font-weight, y
    // acá ninguno de los <p> del cuerpo lo hace.
    $pdf->SetFont('freesans', '', 10);
    $pdf->SetTextColor(0, 0, 0);
    return $y + $cardH;
}

/**
 * Pie de página con la firma del médico y el texto de validez legal — el
 * nombre que aparece como firmante viene siempre de
 * readSigningCertificate() (lo que dice el certificado), nunca de un campo
 * de texto libre del formulario.
 *
 * $hrMarginBottomMm/$dateOnOwnLine: opcionales, default = comportamiento de
 * siempre (todos los documentos salvo que pidan otra cosa explícitamente).
 * Laudos los usa con otros valores (más aire tras la barra, fecha en su
 * propia línea) — pedido puntual para ese documento, ver
 * api/laudos/signed-pdf.php. No cambiar el default acá sin confirmar que
 * es para TODOS los documentos firmados (Atestados/Recetas/Encaminhamentos/
 * Receituário/Pedidos también usan esta misma función).
 *
 * $signedAt: fecha/hora "dd/mm/YYYY HH:MM:SS" ya calculada por el caller.
 * null (default) = la de ahora, idéntico al comportamiento anterior para
 * todos los demás documentos. Laudos lo pasa explícito porque la misma
 * fecha se imprime en TODAS las hojas (pie mini de las hojas 1..N-1 y pie
 * completo de la última) y tienen que ser letra por letra iguales: sin un
 * valor único, dos llamadas separadas por milisegundos pueden caer en
 * segundos distintos.
 */
function drawSignatureFooter(TCPDF $pdf, string $signerName, ?string $signerDocument, ?string $documentLabel, float $fontPt = 7.0, float $hrMarginBottomMm = 2.0, bool $dateOnOwnLine = false, string $crm = 'CRM 161792 SP', ?string $signedAt = null): void {
    $pdf->Ln(2);
    $pdf->SetFont('freesans', '', $fontPt);
    $pdf->writeHTML('<hr style="border-top:0.3mm solid #CBD5E1;margin-bottom:' . $hrMarginBottomMm . 'mm;" />', true, false, true, false, '');

    $esc        = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $signerLine = '<b>' . $esc($signerName) . '</b>';
    if ($signerDocument) {
        $signerLine .= ' (' . $esc($documentLabel ?? 'Documento') . ' ' . $esc($signerDocument);
    } else {
        $signerLine .= ' (';
    }
    // CRM del médico, junto a la identidad del firmante — viene por default acá
    // para que TODOS los documentos firmados (Pedidos/Recetas/Receituário/
    // Encaminhamentos/Laudos/Atestados/Fórmulas pasan por drawSignatureFooter)
    // lo muestren sin tocar cada endpoint.
    $signerLine .= ' - ' . $esc($crm) . ')';

    $dateSep = $dateOnOwnLine ? '<br/>' : ' ';
    $stamp   = $signedAt ?? date('d/m/Y H:i:s');
    $html = '<p style="text-align:center;margin:0;font-size:' . $fontPt . 'pt;color:#6B7280;line-height:1.3;">'
          . 'Assinado digitalmente conforme ICP-Brasil (MP 2.200-2/2001) por ' . $signerLine
          . $dateSep . 'em ' . $stamp . '.<br/>'
          . 'Verifique a autenticidade e integridade do documento em <b style="color:#0F4C81;">validar.iti.gov.br</b>.</p>';

    $pdf->writeHTML($html, true, false, true, false, '');
    $pdf->SetTextColor(0, 0, 0);
}

/**
 * Resuelve la identidad real del firmante (nombre/documento tal cual dice
 * el certificado) SIN dibujar ni firmar nada todavía — separado de
 * signAndDownloadPdf() para que documentos de varias páginas (Pedidos, con
 * una página por examen) puedan dibujar drawSignatureFooter() en CADA
 * página con la misma identidad, en vez de una sola vez al final. El
 * resultado ($sig, ya con 'name' resuelto a $fallbackName si el .pfx no
 * trae CN) se pasa después a signPdfOutput().
 */
function resolveSigner(string $fallbackName): array {
    $cert = loadSigningCert();
    $sig  = readSigningCertificate($cert);
    $sig['name'] = $sig['name'] ?? $fallbackName;
    return $sig;
}

/**
 * Ruta del PDF firmado persistido en disco para un documento — fuera de
 * public/ (no accesible por URL directa), servido solo a través de
 * api/verificar/index.php tras validar token+código de acceso.
 */
function signedPdfStoragePath(string $table, string $id): string {
    $dir = __DIR__ . '/../storage/signed_pdfs/' . $table;
    if (!is_dir($dir)) {
        mkdir($dir, 0700, true);
    }
    return $dir . '/' . $id . '.pdf';
}

function hasSavedSignedPdf(string $table, string $id): bool {
    return file_exists(signedPdfStoragePath($table, $id));
}

/**
 * Firma criptográficamente el PDF (ya construido, con AddPage()/writeHTML()
 * ya llamados, y con drawSignatureFooter() ya dibujado donde corresponda),
 * lo guarda en disco (para que el paciente pueda verlo/descargarlo después
 * desde el link de verificación) y lo envía como descarga adjunta al
 * médico. $sig es el array devuelto por resolveSigner(); $table/$id
 * identifican dónde guardarlo (se omiten para llamadas que no deban
 * persistir nada, aunque hoy todas las firmas pasan estos dos).
 */
function signPdfOutput(TCPDF $pdf, string $filename, array $sig, ?string $table = null, ?string $id = null): void {
    $info = [
        'Name'        => $sig['name'],
        'Location'    => 'São Paulo, SP',
        'Reason'      => 'Documento médico assinado digitalmente',
        'ContactInfo' => '',
    ];

    // Certificado, clave privada (sin passphrase — ya viene decodificada en
    // claro desde el .pfx) y cadena intermedia, todos en PEM: el formato
    // que openssl_pkcs7_sign() realmente sabe leer (ver readSigningCertificate).
    $extracerts = $sig['chainPath'] ?? '';
    $pdf->setSignature('file://' . $sig['certPath'], 'file://' . $sig['keyPath'], '', $extracerts, 2, $info);

    // A propósito NO se llama setSignatureAppearance(): sin ella, TCPDF crea
    // un campo de firma invisible (0x0), así ningún lector de PDF (Adobe
    // Reader dibuja su propio ícono/sello por defecto sobre campos de firma
    // visibles) superpone nada sobre el texto de drawSignatureFooter(). La
    // firma criptográfica sigue siendo igual de válida — "invisible" acá
    // solo describe el widget, no el certificado ni el hash del documento.
    //
    // Output('', 'S') en vez de Output($filename, 'D'): se necesitan los
    // bytes en memoria para guardarlos en disco ANTES de mandarlos al
    // navegador — 'D' los manda directo sin dar la oportunidad de
    // interceptarlos, así que se arman los mismos headers a mano acá.
    $pdfBytes = $pdf->Output($filename, 'S');

    if ($table && $id) {
        file_put_contents(signedPdfStoragePath($table, $id), $pdfBytes);
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($pdfBytes));
    echo $pdfBytes;
}

/**
 * Firma el PDF (ya construido, con AddPage()/writeHTML() ya llamados) con el
 * certificado configurado y lo envía como descarga adjunta. $fallbackName se
 * usa únicamente si el .pfx no se puede leer para extraer el titular real
 * (no debería pasar nunca en producción, ya que es el mismo archivo que
 * setSignature() usa para firmar).
 * Atajo de resolveSigner() + drawSignatureFooter() + signPdfOutput() para
 * los documentos de una sola página (Atestados, Recetas, Encaminhamentos,
 * Fórmulas Infantis) — Pedidos (varias páginas) usa las tres funciones por
 * separado, ver orders/signed-pdf.php.
 */
function signAndDownloadPdf(TCPDF $pdf, string $filename, string $fallbackName, ?string $table = null, ?string $id = null): void {
    $sig = resolveSigner($fallbackName);
    drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel']);
    signPdfOutput($pdf, $filename, $sig, $table, $id);
}

/**
 * Responde SOLO el token/URL de verificación como JSON (nada de PDF) — la
 * mitad "GET" del nuevo flujo de firma para Pedidos/Recetas: el navegador
 * pide esto primero para saber qué URL codificar en el QR que va a dibujar
 * él mismo (con el componente QrCodeSvg ya existente) antes de capturar la
 * plantilla real a PDF. $row debe venir YA con el token resuelto (llamar
 * resolveVerificationUrl() antes de esta función).
 */
function respondVerificationInfo(array $row): void {
    header('Content-Type: application/json');
    echo json_encode([
        'token'     => $row['token'],
        'qrContent' => $row['qr_content'] ?: $row['validation_url'],
    ]);
    exit;
}

/**
 * Firma un PDF que el NAVEGADOR ya armó (capturando la plantilla real de
 * impresión con html2canvas+jsPDF — ver src/lib/pdfCapture.ts) en vez de
 * reconstruirlo desde cero con writeHTML(): en lugar de "dibujar" el
 * documento, este código solo IMPORTA cada página del PDF subido (FPDI,
 * \setasign\Fpdi\Tcpdf\Fpdi — que ES-A TCPDF, por eso drawSignatureFooter()/
 * resolveSigner()/signPdfOutput() siguen sirviendo sin cambios) y le agrega
 * encima la firma legal real, antes de firmar criptográficamente.
 *
 * $signAllPages=true (Pedidos): cada página (un exame) lleva su propia
 * firma real, no solo la última — requisito explícito ya validado en la
 * versión anterior de orders/signed-pdf.php. Para el resto (una sola
 * página), false alcanza.
 *
 * Cada página del PDF subido es una A4 completa (297mm) — el navegador
 * ancla la imagen capturada arriba, sin estirarla, y deja el resto en
 * blanco (ver capturePrintAreaToPdf() en src/lib/pdfCapture.ts).
 *
 * El pie va SIEMPRE a una posición FIJA cerca del borde inferior real de la
 * página ($size['height'] - $footerFromBottomMm) — igual que hacen
 * Atestados/Encaminhamentos/Fórmulas Infantis con su propio "footerZoneH"
 * ($footerY = pageHeight - zona fija; ver api/atestados/signed-pdf.php).
 * Así el pie queda en un contenedor verdaderamente independiente del
 * contenido de arriba: agregar o sacar una línea de examen NUNCA lo mueve.
 * Sólo cede (baja) si el contenido real capturado ($contentHeightsMm, uno
 * por página) es tan alto que invadiría esa zona fija — nunca al revés.
 *
 * $drawFooterText=false (Recetas): no dibuja el texto legal visible ("Assinado
 * digitalmente conforme ICP-Brasil...") — pedido explícito para esa sección.
 * NO afecta la firma criptográfica real (signPdfOutput()/setSignature() se
 * ejecuta igual, siempre) ni el QR de verificación (eso lo dibuja el propio
 * navegador, ya viene adentro de la imagen capturada) — sólo omite el texto
 * de aviso legal impreso en la página.
 */
function signUploadedPdf(string $filename, string $fallbackName, bool $signAllPages, ?array $contentHeightsMm = null, bool $drawFooterText = true, float $footerFromBottomMm = 35.0, ?float $footerBoxWidthMm = null, float $footerFontPt = 7.0, string $footerBoxAlign = 'right', ?string $table = null, ?string $id = null): void {
    $bytes = file_get_contents('php://input');
    if (!$bytes) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['error' => 'Nenhum arquivo PDF recebido.']);
        exit;
    }

    $tmpPath = tempnam(sys_get_temp_dir(), 'sign_upload_');
    file_put_contents($tmpPath, $bytes);
    register_shutdown_function(function () use ($tmpPath) { @unlink($tmpPath); });

    $pdf = new \setasign\Fpdi\Tcpdf\Fpdi('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->SetCreator('NeuroExamenes');
    $pdf->SetAuthor($fallbackName);
    $pdf->setPrintHeader(false);
    $pdf->setPrintFooter(false);

    try {
        $pageCount = $pdf->setSourceFile($tmpPath);
    } catch (\Throwable $e) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['error' => 'Arquivo PDF inválido: ' . $e->getMessage()]);
        exit;
    }

    if ($pageCount < 1) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['error' => 'PDF vazio.']);
        exit;
    }

    $sig = resolveSigner($fallbackName);

    for ($i = 1; $i <= $pageCount; $i++) {
        $templateId = $pdf->importPage($i);
        $size       = $pdf->getTemplateSize($templateId);
        $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
        $pdf->useTemplate($templateId);

        if ($drawFooterText && ($signAllPages || $i === $pageCount)) {
            $contentH     = $contentHeightsMm[$i - 1] ?? null;
            $fixedFooterY = $size['height'] - $footerFromBottomMm;
            // Por defecto va siempre en $fixedFooterY (pie fijo, independiente
            // del contenido). Sólo cede más abajo si el contenido real ya
            // invade esa zona — nunca sube por contenido corto.
            // El límite del "cede" también se aleja del borde real (antes 12mm,
            // ahora 25mm) — un texto a menos de ~12mm del borde físico de la
            // hoja corre riesgo real de quedar recortado por el margen no
            // imprimible de muchas impresoras, aunque en un visor de PDF se
            // vea perfecto (así es como parecía "faltar" al imprimir de
            // verdad, no solo al mirar el PDF en pantalla).
            $footerY = ($contentH !== null && $contentH + 2 > $fixedFooterY)
                ? min($contentH + 2, $size['height'] - 25)
                : $fixedFooterY;

            $pdf->SetAutoPageBreak(false);
            $pdf->SetXY(0, $footerY);
            // $footerBoxWidthMm (Encaminhamentos): columna angosta e
            // independiente del QR (que el navegador dibuja pegado al margen
            // derecho, 20mm) — $footerBoxAlign='left' la ancla al margen
            // izquierdo en vez de compartir la columna derecha con el QR,
            // así quedan uno al lado del otro (misma altura, $footerY) en vez
            // de superpuestos. null (Pedidos, default) = comportamiento de
            // siempre, texto centrado a todo el ancho, sin tocar.
            if ($footerBoxWidthMm !== null) {
                if ($footerBoxAlign === 'left') {
                    $boxLeftMargin = 18;
                    $pdf->SetLeftMargin($boxLeftMargin);
                    $pdf->SetRightMargin($size['width'] - $boxLeftMargin - $footerBoxWidthMm);
                } else {
                    $boxRightMargin = 20;
                    $pdf->SetLeftMargin($size['width'] - $boxRightMargin - $footerBoxWidthMm);
                    $pdf->SetRightMargin($boxRightMargin);
                }
            } else {
                $pdf->SetLeftMargin(18);
                $pdf->SetRightMargin(18);
            }
            drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel'], $footerFontPt);
        }
    }

    signPdfOutput($pdf, $filename, $sig, $table, $id);
}

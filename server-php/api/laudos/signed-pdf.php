<?php
/**
 * GET /api/laudos/{id}/signed-pdf
 *
 * Genera el PDF del laudo pericial enteramente en el SERVIDOR con TCPDF
 * writeHTML() — texto vectorial real, mismo motor que usa "Imprimir" en el
 * navegador para el layout, sin capturar una imagen de la pantalla. Mismo
 * patrón que Atestados (ver api/atestados/signed-pdf.php).
 *
 * Por qué el cambio (2026-09-14): la versión anterior capturaba
 * PrintLaudoTemplate.tsx con html2canvas (signUploadedPdf() en signing.php,
 * como Pedidos/Recetas/Encaminhamentos/Receituário) y firmaba esa imagen.
 * html2canvas reimplementa el layout de texto a mano (mide cada nodo/inline
 * por separado con canvas.measureText()) en vez de usar el motor de texto
 * real del navegador — así que cada vez que el texto cambia de estilo
 * (ej.: "<strong>Paciente:</strong> valor") quedaba un salto/hueco visible
 * en el borde entre ambas corridas de texto. Ningún ajuste de resolución
 * (scale) arregla eso: es un problema de DÓNDE se posiciona el texto, no de
 * qué tan nítido se ve. Al armar el PDF acá con TCPDF (texto vectorial real,
 * un solo motor de tipografía) ese problema desaparece de raíz — al costo
 * de mantener el layout en dos lugares (acá y en PrintLaudoTemplate.tsx,
 * que ahora solo sirve para la impresión normal sin firmar).
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/signing.php';
require_once __DIR__ . '/../../lib/laudoProfiles.php';
require_once __DIR__ . '/../../lib/laudoConclusoes.php';
require_once __DIR__ . '/../../lib/richText.php';
require_once __DIR__ . '/../../lib/laudoWatermarkPdf.php';

setCorsHeaders();

header_register_callback(function () {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
});

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

requireAuth();

$path    = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts   = explode('/', $path);
$idx     = array_search('laudos', $parts);
$laudoId = ($idx !== false && isset($parts[$idx + 1])) ? $parts[$idx + 1] : null;

if (!$laudoId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'ID de laudo no especificado.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('SELECT * FROM laudos WHERE id = ?');
$stmt->execute([$laudoId]);
$r = $stmt->fetch();

if (!$r) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['error' => 'Laudo não encontrado.']);
    exit;
}

resolveVerificationUrl($pdo, 'laudos', 'laudos', $laudoId, $r);

// ------------------------------------------------------------------
// Datos formateados
// ------------------------------------------------------------------
$esc = fn($v) => htmlspecialchars((string)($v ?? ''), ENT_QUOTES, 'UTF-8');

$formatDate = function (?string $iso): ?string {
    if (!$iso) return null;
    $p = explode('-', $iso);
    return count($p) === 3 ? "{$p[2]}/{$p[1]}/{$p[0]}" : $iso;
};

$formattedDate      = $formatDate($r['date']);
$formattedBirthDate = $formatDate($r['patient_birth_date']);

$patientLine = $esc($r['patient_name']) . ($r['orgao'] ? ' (' . $esc($r['orgao']) . ')' : '');
$cids        = trim((string)($r['cids'] ?? ''));
$diagnostico = trim((string)($r['diagnostico'] ?? ''));
$diagLine    = $cids !== '' ? 'CID: ' . $esc($cids) : ($diagnostico !== '' ? $esc($diagnostico) : '—');

$conclusao = $r['conclusao'] ?? '';
// Catálogo administrable de conclusiones — se lee del snapshot del laudo para
// que el PDF firmado no cambie si la opción se edita o borra después.
$conclusaoOpcoes = laudo_conclusoes_parse($r['conclusao_opcoes'] ?? null);

$INK   = '#111827';
$MUTED = '#6B7280';
$LINE  = '#CBD5E1';

// ------------------------------------------------------------------
// HTML del documento — fiel al diseño ya aprobado en PrintLaudoTemplate.tsx
// (caja de paciente con 3 líneas simples, QR abajo a la izquierda arriba
// de la firma, checkbox cuadrado) — NO se reinventa el layout acá, solo se
// reconstruye con TCPDF en vez de con HTML capturado.
// ------------------------------------------------------------------
$htmlPatient  = '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 1mm 0;"><b>Paciente:</b> ' . $patientLine . '</p>';
$htmlPatient .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 1mm 0;"><b>Data de Nascimento:</b> ' . $esc($formattedBirthDate ?: '') . '</p>';
$htmlPatient .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0;"><b>Documento (CPF):</b> ' . $esc($r['patient_identity_card'] ?: '') . '</p>';

$baseInfo = getLaudoBaseInfo($pdo, $r['template_id'], $r['clinic_name']);
$htmlBody  = '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">Base de informações:</p>';
if ($baseInfo !== '') {
    $htmlBody .= '<p style="font-size:9.5pt;line-height:1.5;color:' . $INK . ';margin:0 0 3mm 0;">' . richTextToHtml($baseInfo) . '</p>';
} else {
    $htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 3mm 0;">&nbsp;</p>';
}

// Declarante + fecha — la fecha va DEBAJO del nombre del paciente (no a la
// derecha), igual que la versión HTML de PrintLaudoTemplate.tsx.
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 2mm 0;">' . $patientLine . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 3mm 0;">' . $esc($formattedDate ?: '') . '</p>';

$htmlBody .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 2mm 0;">Ao medico-perito</p>';
$htmlBody .= '<p style="font-size:9.5pt;line-height:1.55;color:' . $INK . ';margin:0 0 3mm 0;">' . richTextToHtml($r['narrative']) . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 3mm 0;">grato</p>';

$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 2mm 0;"><b>Diagnóstico:</b> ' . $diagLine . '</p>';

// LA PÁGINA 1 TERMINA CON EL LABEL "Conclusão Pericial:" (igual que la página
// 1 de PrintLaudoTemplate.tsx); los checkboxes van al inicio de la página 2.
// Sección opcional: si el médico no eligió ninguna opción en el formulario,
// ni el label ni los checkboxes se imprimen (ver drawLaudoCheckbox() abajo).
if ($conclusao !== '') {
    $htmlBody .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0;">Conclusão Pericial:</p>';
}

// Los 3 checkboxes se dibujan aparte, con drawLaudoCheckbox() (caja
// cuadrada nativa, igual que el componente checkbox() de
// PrintLaudoTemplate.tsx) — no van acá porque writeHTML() no dibuja cajas
// inline de forma confiable.

// Segundo bloque de HTML — va DESPUÉS de dibujar los checkboxes nativos
// (ver drawLaudoCheckbox() más abajo), que no pueden ir dentro de un
// writeHTML() normal.
$htmlAfastamento  = '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">Período sugerido de afastamento (quando aplicável):</p>';
$afastDias = $r['afastamento_dias'] !== null ? $r['afastamento_dias'] . ' DIAS' : '—';
$htmlAfastamento .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 2mm 0;">De: <b>' . $esc($afastDias) . '</b></p>';

$htmlAfastamento .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">Observações Adicionais:</p>';
$obs = trim((string)($r['observacoes'] ?? ''));
$htmlAfastamento .= '<p style="font-size:9.5pt;line-height:1.45;color:' . $INK . ';margin:0 0 3mm 0;">' . (isRichTextEmpty($obs) ? '&nbsp;' : richTextToHtml($obs)) . '</p>';

// La "decoración de la hoja de firma" (Local e Data + bloque institucional de
// la clínica) va por SEPARADO del texto de las observações: cuando las OBS son
// largas, el texto fluye solo y esta decoración pasa a la hoja nueva JUNTO con
// el QR + firma + línea legal (ver guarda anti-"hoja sobrante" más abajo). Así
// la última hoja siempre lleva contenido de firma además del pie íntegro.
$localData = trim(($r['local'] ?: '') . ($formattedDate ? ', ' . $formattedDate : ''));
$htmlFirmDecor  = '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0;">Local e Data: <span style="font-weight:normal;">' . $esc($localData) . '</span></p>';

// Bloque institucional de la clínica — va DEBAJO de "Local e Data", con una
// línea separadora, no junto a la firma personal del médico (esa queda
// abajo del todo, con el QR). Alineado a la izquierda como el resto del
// cuerpo, no centrado — es una continuación del texto, no una tarjeta.
$htmlFirmDecor .= '<hr style="border-top:0.3mm solid ' . $LINE . ';margin:3mm 0;" />';
$htmlFirmDecor .= '<p style="font-size:9pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">' . $esc($r['clinic_name']) . '</p>';
$htmlFirmDecor .= '<p style="font-size:8pt;color:' . $MUTED . ';margin:0 0 1mm 0;">' . $esc($r['clinic_address']) . '</p>';
$htmlFirmDecor .= '<p style="font-size:8pt;color:' . $MUTED . ';margin:0;">' . $esc($r['clinic_phone']) . '</p>';

// Firma personal del médico — va en el pie, junto al QR, antes de la línea
// legal que agrega signAndDownloadPdf().
$htmlDoctor  = '<p style="text-align:center;font-size:10pt;font-weight:bold;color:' . $INK . ';margin:0;line-height:1.25;">' . $esc($r['doctor_name']) . '</p>';
$htmlDoctor .= '<p style="text-align:center;font-size:9pt;color:' . $MUTED . ';margin:0.5mm 0 0 0;line-height:1.2;">' . $esc($r['doctor_crm']) . '</p>';

// ------------------------------------------------------------------
// PDF con TCPDF + firma digital
// ------------------------------------------------------------------
// Layout de DOS PÁGINAS FIJO, idéntico a que el navegador imprime
// (PrintLaudoTemplate.tsx: página 1 = membrete + paciente + base info +
// narrativa, termina con el label "Conclusão Pericial:"; página 2 =
// checkboxes + afastamento + observações + local + bloque institucional +
// firma). Así TODAS las clínicas salen con la MISMA composición y el mismo
// respiro — la única variación visual es el logo del membrete.
// ── Marca de agua en TODAS las hojas ──────────────────────────────────────
// Ver el docblock de LaudoWatermarkPdf (lib/laudoWatermarkPdf.php): la marca
// la pinta el hook Header() de TCPDF en startPage() de CADA hoja — normal,
// automática (checkPageBreak) o creada tras un rollback. Antes estaba
// dibujada a mano en 3 puntos explícitos y todas las páginas intermedias
// que TCPDF creaba solo salían sin marca.
// El logo se resuelve ANTES del AddPage(): la marca se pinta en startPage()
// de la página 1 y necesita $wmBin ya cargado.
// Sin logo propio la clínica sale SIN marca de agua (decisión de producto:
// nunca poner el logo de otra clínica como marca).
$logoData = getLaudoLogoDataUri($pdo, $r['template_id'], $r['clinic_name']);
$bin      = $logoData ? base64_decode(substr($logoData, strpos($logoData, ',') + 1)) : null;

$pdf = new LaudoWatermarkPdf('P', 'mm', 'A4', true, 'UTF-8', false);
$pdf->wmBin  = $bin;
$pdf->SetCreator('NeuroExamenes');
$pdf->SetAuthor($r['doctor_name'] ?: 'NeuroExamenes');
$pdf->SetTitle('Laudo Pericial Médico - ' . $r['patient_name']);
$pdf->setPrintHeader(true);   // necesario para que TCPDF llame Header() en cada hoja
$pdf->setPrintFooter(false);

$leftMargin  = 18;
$rightMargin = 18;
$pdf->SetMargins($leftMargin, 20, $rightMargin);
$pdf->SetAutoPageBreak(true, 20);
$pdf->AddPage();

$pdf->SetFont('freesans', '', 10);

$pageWidth = $pdf->getPageWidth();
$contentW  = $pageWidth - $leftMargin - $rightMargin;

/**
 * Checkbox cuadrado nativo — mismo look que el componente checkbox() de
 * PrintLaudoTemplate.tsx (caja con borde + "X" adentro si está marcada), NO
 * la notación "(X)"/"( )" de paréntesis. writeHTML() no dibuja cajas inline
 * de forma confiable, por eso se hace con Rect()/Cell() directo.
 */
function drawLaudoCheckbox(TCPDF $pdf, bool $checked, string $label, float $fontPt = 9.5): void {
    $boxSize = 3.6;
    $x = $pdf->GetX();
    $y = $pdf->GetY();
    $pdf->SetDrawColor(17, 24, 39);
    $pdf->SetLineWidth(0.25);
    $pdf->Rect($x, $y + 0.9, $boxSize, $boxSize, 'D');
    if ($checked) {
        $pdf->SetFont('freesans', 'B', $fontPt - 1.5);
        $pdf->SetXY($x, $y + 0.7);
        $pdf->Cell($boxSize, $boxSize, 'X', 0, 0, 'C');
        $pdf->SetFont('freesans', '', $fontPt);
    }
    $pdf->SetTextColor(17, 24, 39);
    $pdf->SetXY($x + $boxSize + 2.5, $y);
    $pdf->Cell(0, $boxSize + 2.2, $label, 0, 1, 'L');
}

// ── PÁGINA 1 ──────────────────────────────────────────────────────────────
// Membrete. El bloque reserva SIEMPRE 30mm (logo 26mm + aire): aunque la
// clínica todavía no tenga logo, la composición queda idéntica a la de
// CLINICA SAUDE CAMPINAS — solo cambia la imagen dibujada, no el layout.
$logoTop = $pdf->GetY();
$logoH   = 0;
if ($logoData) {
    // Logo ajustado a la caja 45×29mm PRESERVANDO la proporción real de la
    // imagen: los apaisados (ej: Campinas 262×151) quedan a 45mm de ancho
    // (≈26mm de alto), los VERTICALES o circulares (ej: +DOUTOR 425×601)
    // quedan acotados por el alto de 29mm. Antes se pasaba ancho 45 con alto
    // 0 (auto) y un logo vertical salía de 45×63.6mm — el cursor seguía a
    // $logoTop+30 y el título "LAUDO PERICIAL MÉDICO" y la línea horizontal
    // se dibujaban ENCIMA del logo (documento descompaginado).
    $imgDim = getimagesizefromstring($bin);
    if ($imgDim !== false && $imgDim[0] > 0 && $imgDim[1] > 0) {
        $scale = min(45 / $imgDim[0], 29 / $imgDim[1]);
        $logoW = $imgDim[0] * $scale;
        $logoH = $imgDim[1] * $scale;
        $pdf->Image('@' . $bin, ($pageWidth - $logoW) / 2, $logoTop, $logoW, $logoH, 'PNG');
    }
}
// El título parte SIEMPRE debajo del alto real del logo + aire (30mm
// mínimo para las clínicas sin logo; con logo, altoReal + 4mm — para el
// tope actual de 29mm son 33mm): garantiza logo → título → línea sin
// superponerse con CUALQUIER logo.
$pdf->SetY($logoTop + max(30, $logoH + 4));

$pdf->writeHTML('<p style="text-align:center;font-size:14pt;font-weight:bold;letter-spacing:1pt;color:' . $INK . ';margin:0;">LAUDO PERICIAL MÉDICO</p>', true, false, true, false, '');
$pdf->SetY($pdf->GetY() + 2);
$pdf->writeHTML('<hr style="border-top:0.3mm solid ' . $LINE . ';" />', true, false, true, false, '');
$pdf->SetY($pdf->GetY() + 5);

// ── Caja de paciente — recuadro con 3 líneas ("Etiqueta: valor"), igual que
// PrintLaudoTemplate.tsx. Alto fijo para que el texto restante siempre parta
// del mismo lugar, sin importar el largo del nombre del paciente.
$boxY   = $pdf->GetY();
$boxH   = 28;
$boxPad = 4;
$pdf->SetDrawColor(226, 232, 240);
$pdf->SetLineWidth(0.25);
$pdf->RoundedRect($leftMargin, $boxY, $contentW, $boxH, 1.5, '1111', 'D');
$pdf->SetXY($leftMargin + $boxPad, $boxY + $boxPad - 1.5);
$pdf->SetRightMargin($rightMargin + $boxPad);
$pdf->writeHTML($htmlPatient, true, false, true, false, '');
$pdf->SetRightMargin($rightMargin);
$pdf->SetY($boxY + $boxH + 6);

$pdf->writeHTML($htmlBody, true, false, true, false, '');

// ── PÁGINA 2 ──────────────────────────────────────────────────────────────
// Si la narrativa NO derramó (caso normal), cerramos el documento a 2 páginas
// fijas. Si la narrativa sí se paginó sola, NO se fuerza una página nueva —
// los checkboxes continúan donde quedó el texto y el pie acompaña al final
// del contenido (nada de hojas vacías de más).
if ($pdf->getPage() === 1) {
    $pdf->AddPage();
}

// ── Guarda anti-"hoja sobrante" y anti-pie-partido ─────────────────────────
// Los dos síntomas viejos venían de dibujar el pie (QR card fijo de 55mm +
// bloque del médico + línea legal ICP-Brasil ≈ 88mm) muy abajo en la hoja:
// (a) writeHTML/MultiCell paganizan solas y la línea legal saltaba a una hoja
// nueva (pie cortado + hoja sobrante con fragmentos); (b) pasar el pie SOLO a
// una hoja nueva dejaba una hoja casi vacía con solo el QR y la firma.
//
// Ahora el texto (checkboxes + período + observações) fluye naturalmente
// (SetAutoPageBreak). La "decoración de la hoja de firma" (Local e Data +
// bloque institucional de la clínica) va JUNTO con el QR/firma/legal en un
// bloque compacto e indivisible: el pie NO se ancla a una altura fija (esa
// idea abría huecos de ~120mm de aire entre la decoración y el QR), sino que
// sigue al contenido con ~8mm de aire, igual que la impresión normal
// (PrintLaudoTemplate.tsx, FOOTER_GAP_PX ≈ 7.4mm). Si tras el texto no cabe
// el bloque entero antes del margen inferior (297 − 20), se pasa COMPLETO a
// una hoja nueva — medido con una transacción TCPDF antes de dibujar, así el
// texto nunca queda pegado ni al borde ni al pie, ni el pie se parte ni deja
// una hoja a medio llenar.
$footerFitMm = 88;    // alto real del pie (QR 55mm + médico + línea legal)

// Checkboxes de la Conclusão Pericial: uno por opción del catálogo, en el
// orden guardado, marcando el elegido. La lista sale del SNAPSHOT del laudo
// (laudos.conclusao_opcoes) y no del catálogo actual — si el médico edita o
// borra una opción después de firmar, este PDF (documento legal, descarga
// pública de verificación) tiene que seguir mostrando lo que se firmó.
if ($conclusao !== '') {
    foreach ($conclusaoOpcoes as $opt) {
        $pdf->SetX($leftMargin);
        drawLaudoCheckbox($pdf, $conclusao === $opt['id'], $opt['label']);
    }
    $pdf->SetY($pdf->GetY() + 4);
}

// Texto: período + observações — puede paginar solo si las OBS son largas.
$pdf->writeHTML($htmlAfastamento, true, false, true, false, '');

// resolveSigner()+drawSignatureFooter()+signPdfOutput() por separado (en
// vez del atajo signAndDownloadPdf()) para poder pedirle a
// drawSignatureFooter() el formato puntual de Laudos: más aire después de
// la barra divisoria (hrMarginBottomMm) y la fecha en su propia línea
// (dateOnOwnLine) — sin tocar el comportamiento por default que usan
// Atestados/Encaminhamentos/Fórmulas Infantis con el mismo atajo.
$sig = resolveSigner($r['doctor_name'] ?: 'Médico');

// Fecha/hora de la firma calculada UNA sola vez: la misma se imprime en el
// pie completo de la última hoja y en el pie mini de todas las anteriores
// (ver el loop post-pass al final). Con dos date() separados podrían caer en
// segundos distintos y un documento legal no puede mostrar dos horas.
$signedAt = date('d/m/Y H:i:s');

// El bloque de firma (decoración + QR + médico + línea legal) se mide ENTERO
// dentro de una transacción TCPDF: si el bloque no cabe antes del margen
// inferior (297 − 20), se descarta y se vuelve a dibujar íntegro en una hoja
// nueva (el rollback restaura página y posición Y, y la página extra que
// hubiera creado el AutoPageBreak desaparece). Así el pie nunca se parte, no
// queda pegado al borde de la hoja, y la decoración y el pie SIEMPRE quedan
// juntos en la última hoja, uno tras otro (el pie SIGUE al contenido con un
// aire fijo de ~8mm, igual que la impresión normal).
$blockWasMoved = false;
$pdf->startTransaction();
$blockStartPage = $pdf->getPage();
$pdf->writeHTML($htmlFirmDecor, true, false, true, false, '');
$qrY = drawQrVerificationBox($pdf, $leftMargin, $pdf->GetY() + 8, 44, $r['qr_content'], $r['token'], $r['access_code'] ?? null);
$pdf->SetY($qrY + 4);
$pdf->writeHTML($htmlDoctor, true, false, true, false, '');
drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel'], fontPt: 7.0, hrMarginBottomMm: 5.0, dateOnOwnLine: true, signedAt: $signedAt);
if ($pdf->getPage() !== $blockStartPage || $pdf->GetY() > $pdf->getPageHeight() - 20) {
    $pdf->rollbackTransaction(true);
    $blockWasMoved = true;
    $pdf->AddPage();
    $pdf->writeHTML($htmlFirmDecor, true, false, true, false, '');
    $qrY = drawQrVerificationBox($pdf, $leftMargin, $pdf->GetY() + 8, 44, $r['qr_content'], $r['token'], $r['access_code'] ?? null);
    $pdf->SetY($qrY + 4);
    $pdf->writeHTML($htmlDoctor, true, false, true, false, '');
    drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel'], fontPt: 7.0, hrMarginBottomMm: 5.0, dateOnOwnLine: true, signedAt: $signedAt);
}

// ── Post-pass: encabezado de continuidad + pie de firma en cada hoja ───────
// Se dibuja AL FINAL, página por página, porque el número de páginas reales
// recién se conoce tras escribir todo el contenido.
//
// (a) Encabezado de continuidad — SOLO en las páginas 2+. La página 1 ya
//     lleva el nombre en la caja de paciente. Banda superior 5–15mm, texto
//     centrado, línea divisoria a 15mm, contenido a 20mm — mismo diseño que
//     PrintLaudoTemplate.tsx.
//
// (b) Pie de firma mini — en TODAS las hojas MENOS la última (esa ya lleva
//     el bloque completo: Local e Data + clínica + QR 44×55 + firma médica +
//     línea legal). Pedido del médico: repetir la firma en cada hoja.
//
//     Composición: separador fino + QR de verificación de 13mm a la izquierda
//     + la MISMA línea legal ICP-Brasil a 6pt en 2 líneas a su derecha.
//
//     Vive en la banda y = 279..293mm, DENTRO del margen inferior de 20mm
//     que ya reserva SetAutoPageBreak(true, 20) — el contenido corta en
//     y = 277 (297 − 20), la marca de agua centrada ocupa y ≈ 108..189, y
//     esta banda 279..293: las tres zonas no se pisan. CERO reflow: no se
//     agranda ningún margen, así el layout aprobado no se mueve.
//
//     setAutoPageBreak(false, …) es OBLIGATORIO DENTRO del loop, después de
//     setPage($p). setPage() (tcpdf.php) restaura AutoPageBreak y bMargin
//     desde pagedim[$p], así que un setAutoPageBreak hecho ANTES del loop se
//     pierde en la primera iteración y dibujar en y = 279 > PageBreakTrigger
//     = 277 dispara AddPage() fantasma vía checkPageBreak()/AcceptPageBreak().
//     Se restaura apenas termina el loop.
//
//     margen 0 (y no 20): PageBreakTrigger = h − bMargin = 297. MultiCell()
//     decide su rama de "split cell" solo contra PageBreakTrigger, sin mirar
//     AutoPageBreak; con margen 20 y = 283.4 > 277 le daba $newh negativo y
//     el texto salía corrido. Con trigger = 297 esa rama no se activa nunca.
$numPages = $pdf->getNumPages();
$lastPage = $pdf->getPage();
$hdrPad   = 18; // mismo margen lateral del cuerpo
$pageW    = $pdf->getPageWidth();
$availW   = $pageW - 2 * $hdrPad;
$cellW    = $availW - 30; // reserva ~30mm para el número de página a la derecha

// Texto legal del pie mini — MISMAS piezas que arma drawSignatureFooter()
// (nombre/CNPJ/CRM salen del certificado vía resolveSigner(), nunca de un
// campo libre), en texto plano porque acá no hay writeHTML.
$crmMini     = 'CRM 161792 SP';
$signerMini  = (string) $sig['name'];
if (!empty($sig['document'])) {
    $signerMini .= ' (' . ($sig['documentLabel'] ?? 'Documento') . ' ' . $sig['document'];
} else {
    $signerMini .= ' (';
}
$signerMini     .= ' - ' . $crmMini . ')';
$miniLegalText   = 'Assinado digitalmente conforme ICP-Brasil (MP 2.200-2/2001) por '
                 . $signerMini . ' em ' . $signedAt . '. '
                 . 'Verifique a autenticidade e integridade do documento em validar.iti.gov.br.';

// Banda del pie (mm desde el borde superior de la hoja A4, 297 de alto).
$bandTop = 279;
$bandH   = 14;
$qrMini  = 13;
$miniX   = $leftMargin + $qrMini + 3;   // texto a la derecha del QR
$miniW   = $pageW - $rightMargin - $miniX;
$lineH   = 2.6;

for ($p = 1; $p <= $numPages; $p++) {
    $pdf->setPage($p);            // anula el setAutoPageBreak anterior
    $pdf->setAutoPageBreak(false, 0);

    // ── (a) Encabezado de continuidad — páginas 2+ ──
    if ($p > 1) {
        // Nombre (con el Benefício/Órgão, igual que la página 1) en TEXTO
        // PLANO — $patientLine ya está escapado para HTML ($esc) y Cell() no
        // lo interpreta, así que de ahí saldría literal "&amp;" en un nombre
        // con "&".
        $plainPatient = $r['patient_name'] . ($r['orgao'] ? ' (' . $r['orgao'] . ')' : '');
        $fullText     = 'Paciente: ' . $plainPatient;

        // Truncado con "…" si no entra junto al número de página.
        $pdf->SetFont('freesans', '', 8);
        if ($pdf->GetStringWidth($fullText) > $cellW) {
            $maxW = $cellW;
            while ($fullText !== '' && $pdf->GetStringWidth($fullText) > $maxW) {
                $fullText = preg_replace('/.$/u', '', $fullText);
            }
            $fullText = rtrim($fullText) . '…';
        }

        $pdf->SetTextColor(107, 114, 128); // #6B7280
        $pdf->SetXY($hdrPad, 8);
        $pdf->Cell($cellW, 4, $fullText, 0, 0, 'L');

        $pdf->SetFont('freesans', '', 7.5);
        $pdf->SetTextColor(156, 163, 175); // #9CA3AF
        $pdf->SetXY($pageW - $hdrPad, 8);
        $pdf->Cell(0, 4, 'Página ' . $p . ' de ' . $numPages, 0, 1, 'R');

        $pdf->SetDrawColor(226, 232, 240); // #E2E8F0
        $pdf->SetLineWidth(0.2);
        $pdf->Line($hdrPad, 15, $pageW - $hdrPad, 15);
    }

    // ── (b) Pie de firma mini — todas menos la última ──
    if ($p < $numPages) {
        // Separador: 1.5mm por debajo del límite de contenido (277) para que
        // ni de lejos toque la última línea de texto.
        $pdf->SetDrawColor(226, 232, 240); // #E2E8F0
        $pdf->SetLineWidth(0.2);
        $pdf->Line($leftMargin, $bandTop - 0.5, $pageW - $rightMargin, $bandTop - 0.5);

        // QR de verificación — el mismo $r['qr_content'] del pie completo
        // (apunta a /api/verificar/…, no a validar.iti.gov.br: quien lo
        // escanea ve el documento real al instante).
        $pdf->write2DBarcode($r['qr_content'], 'QRCODE,H', $leftMargin, $bandTop + ($bandH - $qrMini) / 2, $qrMini, $qrMini, [], 'N');

        // Línea legal a 6pt, centrada verticalmente en la banda y
        // centrada horizontalmente dentro del ancho que queda a la derecha
        // del QR (el QR ocupa 18..31mm, no se puede centrar en todo el
        // ancho sin pisarlo).
        $pdf->SetFont('freesans', '', 6);
        $pdf->SetTextColor(107, 114, 128); // #6B7280
        $miniLines = max(1, $pdf->getNumLines($miniLegalText, $miniW));
        $miniY     = $bandTop + max(0, ($bandH - $miniLines * $lineH) / 2);
        $pdf->MultiCell($miniW, $lineH, $miniLegalText, 0, 'C', false, 1, $miniX, $miniY);
    }
}
$pdf->setAutoPageBreak(true, 20);
$pdf->setPage($lastPage);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetFont('freesans', '', 10);

signPdfOutput($pdf, 'laudo_' . $laudoId . '_assinado.pdf', $sig, 'laudos', $laudoId);

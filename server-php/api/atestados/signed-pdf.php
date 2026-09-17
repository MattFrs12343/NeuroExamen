<?php
/**
 * GET /api/atestados/{id}/signed-pdf
 * Genera el PDF del atestado (mismo layout que PrintAtestadoTemplate.tsx,
 * con un encabezado de verificación estilo ICP-Brasil) y lo firma
 * digitalmente (PAdES) con el certificado del médico.
 * Requiere TCPDF (composer require tecnickcom/tcpdf) y
 * CERT_PFX_PATH/CERT_PFX_PASSWORD configurados en .env.
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/signing.php';

setCorsHeaders();

// Sin esto, el navegador puede servir una respuesta vieja de su caché HTTP
// local para esta misma URL (siempre igual: /atestados/{id}/signed-pdf, sin
// parámetro que cambie) en vez de pedirle una nueva al servidor — cada
// firma es una operación distinta (fecha/hora, token si es la primera vez),
// así que esta respuesta nunca debe quedar cacheada.
// TCPDF pone sus PROPIOS headers de caché (Cache-Control/Pragma) justo
// antes de escribir el PDF al final de signAndDownloadPdf(), y esos
// pisarían cualquier header('Cache-Control', ...) que se ponga acá arriba
// (header() con el mismo nombre reemplaza al anterior, y el de TCPDF corre
// después). header_register_callback() se ejecuta automáticamente justo
// antes del primer byte de salida — es decir, después de que TCPDF ya puso
// los suyos — así que gana esta versión.
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

// Extract atestado id from URL: /api/atestados/{id}/signed-pdf
$path       = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts      = explode('/', $path);
$idx        = array_search('atestados', $parts);
$atestadoId = ($idx !== false && isset($parts[$idx + 1])) ? $parts[$idx + 1] : null;

if (!$atestadoId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'ID de atestado no especificado.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('
    SELECT a.*, p.name AS patient_name, p.identity_card AS patient_identity_card
    FROM atestados a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.id = ?
');
$stmt->execute([$atestadoId]);
$a = $stmt->fetch();

if (!$a) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['error' => 'Atestado no encontrado.']);
    exit;
}

// ------------------------------------------------------------------
// Token de verificación pública — se genera UNA sola vez y se guarda. El QR
// del PDF apunta a /api/verificar/atestados/{token}, una página real que
// consulta este mismo registro y muestra los datos tal cual están acá —
// nada inventado ni un código decorativo que no lleva a ningún lado.
// ------------------------------------------------------------------
resolveVerificationUrl($pdo, 'atestados', 'atestados', $atestadoId, $a, 'signed_at');

// ------------------------------------------------------------------
// HTML del documento — misma estructura que PrintAtestadoTemplate.tsx, con
// un acabado más formal para la versión firmada (divisores reales — TCPDF
// no respeta border-bottom en <div>, así que se usan <hr> explícitos —,
// texto justificado y una tarjeta de verificación con pasos numerados,
// mismo lenguaje visual que los PDFs de Mevo que ya conoce el médico).
// ------------------------------------------------------------------
$esc    = fn($v) => htmlspecialchars((string)($v ?? ''), ENT_QUOTES, 'UTF-8');
$formatDate = function (?string $iso): ?string {
    if ($iso === null || trim($iso) === '') return null;
    $p = explode('-', $iso);
    return count($p) === 3 ? "{$p[2]}/{$p[1]}/{$p[0]}" : $iso;
};
$formatDateTime = function (?string $iso) use ($formatDate): ?string {
    if ($iso === null || trim($iso) === '') return null;
    $p    = preg_split('/[\sT]/', $iso, 2);
    $date = $formatDate($p[0] ?? null);
    if ($date === null) return $iso;
    return isset($p[1]) && $p[1] !== '' ? "{$date} {$p[1]}" : $date;
};
$BRAND  = '#0F4C81';
$INK    = '#111111';
$MUTED  = '#6B7280';
$FAINT  = '#9CA3AF';
$LINE   = '#CBD5E1';

$hasClinic = $a['clinic_name'] || $a['clinic_secretaria'] || $a['clinic_sistema']
    || $a['clinic_address'] || $a['clinic_phone'] || $a['clinic_cnpj'];

// Bloque "IDENTIFICAÇÃO DO EMISSOR" — ancho completo, arriba de todo.
$htmlClinic = '';
if ($hasClinic) {
    $htmlClinic .= '<p style="font-size:7pt;font-weight:bold;color:' . $FAINT . ';letter-spacing:0.03em;margin:0;">IDENTIFICAÇÃO DO EMISSOR</p>';
    if ($a['clinic_name']) {
        $htmlClinic .= '<p style="font-size:13pt;font-weight:bold;color:' . $INK . ';margin:1mm 0 0 0;">' . strtoupper($esc($a['clinic_name'])) . '</p>';
    }
    $secSis = array_filter([$a['clinic_secretaria'], $a['clinic_sistema']]);
    if ($secSis) {
        $htmlClinic .= '<p style="font-size:10pt;font-weight:bold;color:' . $MUTED . ';margin:1mm 0 0 0;">' . $esc(implode(' — ', $secSis)) . '</p>';
    }
    if ($a['clinic_address']) {
        $htmlClinic .= '<p style="font-size:9pt;color:' . $MUTED . ';margin:1.5mm 0 0 0;">' . nl2br($esc($a['clinic_address'])) . '</p>';
    }
    $contact = array_filter([
        $a['clinic_phone'] ? 'Tel: ' . $a['clinic_phone'] : '',
        $a['clinic_cnpj'] ? 'CNPJ: ' . $a['clinic_cnpj'] : '',
    ]);
    if ($contact) {
        $htmlClinic .= '<p style="font-size:9pt;color:' . $MUTED . ';margin:1mm 0 0 0;">' . $esc(implode(' · ', $contact)) . '</p>';
    }
}

// Bloque "PACIENTE" — columna izquierda, al lado de la tarjeta del QR.
// Separado en dos tramos (nombre / resto) para poder dibujar la barra de
// acento entre ambos, igual que en PrintAtestadoTemplate.tsx.
$issuedAt          = $formatDateTime($a['issued_at'] ?: $a['signed_at']);
$htmlPatientName    = '<p style="font-size:7pt;font-weight:bold;color:' . $FAINT . ';margin-bottom:0;">PACIENTE</p>';
$htmlPatientName   .= '<p style="font-size:15pt;font-weight:bold;color:' . $INK . ';margin-top:1mm;">' . strtoupper($esc($a['patient_name'])) . '</p>';

$htmlPatientRest  = '<table cellpadding="1" style="font-size:8pt;"><tr>';
$htmlPatientRest .= '<td width="34%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">CPF DO PACIENTE</span><br/>' . $esc($a['patient_identity_card'] ?: '—') . '</td>';
$htmlPatientRest .= '<td width="33%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">NASCIMENTO</span><br/>' . $esc($formatDate($a['patient_birth_date']) ?: '—') . '</td>';
$htmlPatientRest .= '<td width="33%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">EMISSÃO</span><br/>' . $esc($issuedAt ?: '—') . '</td>';
$htmlPatientRest .= '</tr></table>';
if ($a['patient_address']) {
    $htmlPatientRest .= '<p style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';margin:2mm 0 0 0;">ENDEREÇO</p>';
    $htmlPatientRest .= '<p style="font-size:8pt;color:' . $INK . ';margin-top:0;">' . $esc($a['patient_address']) . '</p>';
}

// Título + contenido médico — ancho completo, debajo del encabezado. El CID
// se trata como un dato más (etiqueta chica + valor grande), con el mismo
// lenguaje visual que CPF/NASCIMENTO/EMISSÃO arriba — un médico que ya
// aprendió a leer esos campos reconoce el patrón acá también, en vez de
// tener que parsear una oración "CID: X" con otro estilo.
$htmlBody  = '<p style="text-align:center;font-size:18pt;font-weight:bold;letter-spacing:0.5pt;color:' . $INK . ';margin:0;">ATESTADO MÉDICO</p>';
$htmlBody .= '<p style="font-size:7pt;font-weight:bold;color:' . $FAINT . ';letter-spacing:0.03em;margin:5mm 0 0 0;">CID</p>';
$htmlBody .= '<p style="font-size:13pt;font-weight:bold;color:' . $INK . ';margin:1mm 0 4mm 0;">' . $esc($a['cid']) . '</p>';

$period   = implode(' às ', array_filter([$a['care_start_time'], $a['care_end_time']]));
$careDate = $formatDate($a['care_date']) ?: '';
$restDays = $a['rest_days'] ?: '';

// Dos oraciones independientes en vez de una sola armada por concatenación:
// si falta el horário (período) o los días de repouso, la versión anterior
// dejaba huecos ("no período das  do dia..." / "por  dia(s)."). Cada
// oración ahora se arma sólo con los datos que existen, y la segunda se
// omite directamente si no hay días de repouso cargados.
//
// text-align:left (NO justify): un párrafo de una sola línea justificado
// se estira para llenar todo el ancho de la columna — TCPDF, a diferencia
// de un navegador, no exceptúa la última/única línea de un párrafo
// justificado, así que quedaban huecos enormes entre palabras en las
// oraciones cortas. Con el ancho de columna ya generoso por los márgenes,
// alineado a la izquierda se lee más prolijo de todos modos.
$sentence1 = 'Esteve sob cuidados profissionais';
if ($period)   { $sentence1 .= ' no período das <b>' . $esc($period) . '</b>'; }
if ($careDate) { $sentence1 .= ($period ? ' do dia ' : ' no dia ') . $esc($careDate); }
$htmlBody .= '<p style="font-size:11pt;line-height:1.35;margin:0;color:' . $INK . ';">' . $sentence1 . '.</p>';

if ($restDays) {
    $sentence2 = 'Deverá permanecer em repouso a partir de hoje';
    if ($careDate) { $sentence2 .= ' (' . $esc($careDate) . ')'; }
    $sentence2 .= ' por <b>' . $esc($restDays) . '</b> dia(s).';
    $htmlBody .= '<p style="font-size:11pt;line-height:1.35;margin-top:1.5mm;color:' . $INK . ';">' . $sentence2 . '</p>';
}

if ($a['observation']) {
    $htmlBody .= '<p style="font-size:7pt;font-weight:bold;color:' . $FAINT . ';letter-spacing:0.03em;margin:4mm 0 0 0;">OBSERVAÇÃO</p>';
    $htmlBody .= '<p style="font-size:11pt;line-height:1.35;margin:1mm 0 0 0;color:' . $INK . ';">' . $esc($a['observation']) . '</p>';
}

// Bloque del médico — sólo esto va en el pie (más la línea legal que
// agrega drawSignatureFooter). El QR queda arriba, al lado de PACIENTE.
// Márgenes explícitos en cada línea (en vez de dejar el espaciado por
// defecto de TCPDF entre <p>, que es más ancho de lo que parece en pantalla
// y era justo lo que hacía ver "suelto" el pie).
// La dirección del pie sigue a la clínica seleccionada (la misma que ya se
// ve arriba, en IDENTIFICAÇÃO DO EMISSOR) — no la dirección fija del
// médico, que quedaba igual sin importar qué clínica se eligió. Acá va
// SOLO la dirección, el resto de los datos de la clínica (nombre,
// secretaria/sistema, teléfono, CNPJ) ya se muestran arriba, una vez.
$footerAddress = $a['clinic_address'] ?: $a['doctor_address'];
$htmlDoctor  = '<p style="text-align:center;font-size:10pt;font-weight:bold;color:' . $INK . ';margin:0;line-height:1.2;">' . $esc($a['doctor_name']) . '</p>';
$htmlDoctor .= '<p style="text-align:center;font-size:9pt;color:' . $MUTED . ';margin:0.5mm 0 0 0;line-height:1.2;">' . $esc($a['doctor_crm']) . '</p>';
$htmlDoctor .= '<p style="text-align:center;font-size:8pt;color:' . $MUTED . ';margin:0.5mm 0 0 0;line-height:1.2;">' . $esc($footerAddress) . '</p>';
$htmlDoctor .= '<p style="text-align:center;font-size:7pt;color:' . $FAINT . ';margin:2mm 0 0 0;line-height:1.3;">A exibição do CID no atestado médico foi solicitada pelo paciente (ou representante legal), conforme Art. 5º CFM 1658/02.</p>';

// ------------------------------------------------------------------
// PDF con TCPDF + firma digital
// ------------------------------------------------------------------
$pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
$pdf->SetCreator('NeuroExamenes');
$pdf->SetAuthor($a['doctor_name'] ?: 'NeuroExamenes');
$pdf->SetTitle('Atestado Médico - ' . $a['patient_name']);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
// Márgenes generosos a propósito — es lo que hace que la plantilla se lea
// minimalista en vez de apretada, más que cualquier ajuste de colores/cajas.
$leftMargin  = 26;
$rightMargin = 26;
$pdf->SetMargins($leftMargin, 22, $rightMargin);
$pdf->SetAutoPageBreak(true, 20);
$pdf->AddPage();

// Marco visible del margen — un rectángulo dibujado más cerca del borde
// físico de la hoja que el margen de texto de arriba (26mm), para que el
// margen se vea como una línea real en el papel en vez de quedar como
// espacio en blanco que puede pasar desapercibido.
$frameMargin = 10;
$pdf->SetLineWidth(0.4);
$pdf->SetDrawColor(17, 17, 17);
$pdf->Rect(
    $frameMargin,
    $frameMargin,
    $pdf->getPageWidth() - 2 * $frameMargin,
    $pdf->getPageHeight() - $frameMargin - 8,
    'D'
);

// 'freesans' (embebida/subseteada) en vez de la fuente core 'helvetica' por
// defecto de TCPDF: la core no viaja embebida en el PDF (sin tabla /Widths),
// así que visores sin las métricas de Helvetica (WhatsApp, previews web,
// apps móviles) sustituyen por una fuente genérica y el texto sale
// desalineado/deformado. freesans es métricamente equivalente a
// Helvetica/Arial y sí queda embebida, garantizando el mismo resultado en
// cualquier lector.
$pdf->SetFont('freesans', '', 10);

// ── Encabezado: clínica arriba (ancho completo) y, debajo, PACIENTE
// (izquierda) + tarjeta del QR (derecha) — una sola vez, acá. El footer
// abajo sólo tiene los datos del médico y la línea legal, nada de QR.
$pageWidth  = $pdf->getPageWidth();
$contentW   = $pageWidth - $leftMargin - $rightMargin;

if ($htmlClinic) {
    $pdf->writeHTML($htmlClinic, true, false, true, false, '');
    $pdf->SetY($pdf->GetY() + 4);
    $pdf->writeHTML('<hr style="border-top:0.3mm solid ' . $LINE . ';" />', true, false, true, false, '');
    $pdf->SetY($pdf->GetY() + 6);
}

$qrColW   = 44;
$gapCol   = 8;
$leftColW = $contentW - $qrColW - $gapCol;
$qrColX   = $leftMargin + $leftColW + $gapCol;

$yCols = $pdf->GetY();
$pdf->SetRightMargin($pageWidth - $leftMargin - $leftColW);
$pdf->writeHTML($htmlPatientName, true, false, true, false, '');

// Barra de acento bajo el nombre — mismo detalle visual que el template de
// pantalla (PrintAtestadoTemplate.tsx). Ancho DINÁMICO: mide el nombre
// realmente renderizado (mismo font/tamaño que el <p> de arriba) en vez de
// un ancho fijo de 14mm que quedaba corto para nombres largos y largo de
// más para nombres cortos — la barra tiene que "calzar" con el texto.
$barY = $pdf->GetY() + 1;
$pdf->SetFont('freesans', 'B', 15);
$nameBarW = min($pdf->GetStringWidth(strtoupper($a['patient_name'])), $leftColW);
$pdf->SetFont('freesans', '', 10);
$pdf->SetFillColor(17, 17, 17);
$pdf->Rect($leftMargin, $barY, $nameBarW, 0.9, 'F');
$pdf->SetY($barY + 3.5);

$pdf->writeHTML($htmlPatientRest, true, false, true, false, '');
$yAfterLeft = $pdf->GetY();
$pdf->SetRightMargin($rightMargin);

$yAfterRight = drawQrVerificationBox($pdf, $qrColX, $yCols, $qrColW, $a['qr_content'], $a['token']);

// Divisoria entre el encabezado (paciente + QR) y el título — marca dónde
// termina un bloque y empieza el otro, en vez de que quede todo flotando
// en el mismo bloque de aire.
$pdf->SetY(max($yAfterLeft, $yAfterRight) + 8);
$pdf->writeHTML('<hr style="border-top:0.3mm solid ' . $LINE . ';" />', true, false, true, false, '');
$pdf->SetY($pdf->GetY() + 8);

$pdf->writeHTML($htmlBody, true, false, true, false, '');

// ── Pie anclado al fondo de la página, NO al final del contenido de
// arriba. Antes el pie simplemente continuaba después del cuerpo, así que
// un atestado con poco texto (sin observação, sin dirección larga) subía
// todo el bloque de firma hacia la mitad de la hoja — parecía que "tocar"
// el cuerpo movía el pie, porque de hecho lo movía. Fijar la Y evita eso:
// el pie siempre arranca en el mismo lugar salvo que el cuerpo sea tan
// largo que lo alcance, en cuyo caso cede (max()) en vez de solaparse.
// 65mm: el bloque del médico + la línea legal ocupan ~45-48mm en el peor
// caso (dirección en 2 líneas, nombre del certificado largo); con 65mm de
// zona, arranca con margen de sobra antes del umbral de salto de página
// automático (pageHeight - 20mm), así no se corta a una segunda hoja.
$footerZoneH = 65;
$footerY     = $pdf->getPageHeight() - $footerZoneH;
$pdf->SetY(max($pdf->GetY() + 8, $footerY));

$pdf->writeHTML($htmlDoctor, true, false, true, false, '');

// $fallbackName sólo se usa si el .pfx no se puede leer para extraer el
// titular real del certificado (ver readSigningCertificate en signing.php);
// el nombre que se firma e imprime en el pie es el que dice el
// certificado, no este campo de texto libre del formulario.
signAndDownloadPdf($pdf, 'atestado_' . $atestadoId . '_assinado.pdf', $a['doctor_name'] ?: 'Médico', 'atestados', $atestadoId);

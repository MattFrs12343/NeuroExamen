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
require_once __DIR__ . '/../../lib/richText.php';

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
$mark      = fn(string $key) => $conclusao === $key ? '(X)' : '( )';

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
    $htmlBody .= '<p style="font-size:9.5pt;line-height:1.5;color:' . $INK . ';margin:0 0 4mm 0;">' . richTextToHtml($baseInfo) . '</p>';
} else {
    $htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 4mm 0;">&nbsp;</p>';
}

// Declarante + fecha — la fecha va DEBAJO del nombre del paciente (no a la
// derecha), igual que la versión HTML de PrintLaudoTemplate.tsx.
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 2mm 0;">' . $patientLine . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 4mm 0;">' . $esc($formattedDate ?: '') . '</p>';

$htmlBody .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 2mm 0;">Ao medico-perito</p>';
$htmlBody .= '<p style="font-size:9.5pt;line-height:1.55;color:' . $INK . ';margin:0 0 4mm 0;">' . richTextToHtml($r['narrative']) . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 5mm 0;">grato</p>';

$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 3mm 0;"><b>Diagnóstico:</b> ' . $diagLine . '</p>';

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
$htmlAfastamento .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 4mm 0;">De: <b>' . $esc($afastDias) . '</b></p>';

$htmlAfastamento .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">Observações Adicionais:</p>';
$obs = trim((string)($r['observacoes'] ?? ''));
$htmlAfastamento .= '<p style="font-size:9.5pt;line-height:1.45;color:' . $INK . ';margin:0 0 5mm 0;">' . (isRichTextEmpty($obs) ? '&nbsp;' : richTextToHtml($obs)) . '</p>';

$localData = trim(($r['local'] ?: '') . ($formattedDate ? ', ' . $formattedDate : ''));
$htmlAfastamento .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0;">Local e Data: <span style="font-weight:normal;">' . $esc($localData) . '</span></p>';

// Bloque institucional de la clínica — va DEBAJO de "Local e Data", con una
// línea separadora, no junto a la firma personal del médico (esa queda
// abajo del todo, con el QR). Alineado a la izquierda como el resto del
// cuerpo, no centrado — es una continuación del texto, no una tarjeta.
$htmlAfastamento .= '<hr style="border-top:0.3mm solid ' . $LINE . ';margin:3mm 0;" />';
$htmlAfastamento .= '<p style="font-size:9pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">' . $esc($r['clinic_name']) . '</p>';
$htmlAfastamento .= '<p style="font-size:8pt;color:' . $MUTED . ';margin:0 0 1mm 0;">' . $esc($r['clinic_address']) . '</p>';
$htmlAfastamento .= '<p style="font-size:8pt;color:' . $MUTED . ';margin:0;">' . $esc($r['clinic_phone']) . '</p>';

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
$pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
$pdf->SetCreator('NeuroExamenes');
$pdf->SetAuthor($r['doctor_name'] ?: 'NeuroExamenes');
$pdf->SetTitle('Laudo Pericial Médico - ' . $r['patient_name']);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);

$leftMargin  = 18;
$rightMargin = 18;
$pdf->SetMargins($leftMargin, 16, $rightMargin);
$pdf->SetAutoPageBreak(true, 16);
$pdf->AddPage();

$pdf->SetFont('freesans', '', 10);

$pageWidth = $pdf->getPageWidth();
$contentW  = $pageWidth - $leftMargin - $rightMargin;

// ── Marca de agua: logo de la clínica al fondo de la página en curso ──────
// Se dibuja ANTES del contenido de cada página (justo después del AddPage)
// para quedar DETRÁS del texto — en PDF el último dibujo es el que va
// delante. Mismo comportamiento que PrintLaudoTemplate.tsx (alpha 0.07,
// centrado, 140mm de ancho).
$logoData = getLaudoLogoDataUri($pdo, $r['template_id'], $r['clinic_name']);
$bin      = $logoData ? base64_decode(substr($logoData, strpos($logoData, ',') + 1)) : null;

$drawLaudoWatermark = function (TCPDF $pdf, string $bin, float $wmW = 140): void {
    // Alto proporcional al que usa el navegador (height:auto):
    $imgDim        = getimagesizefromstring($bin);
    $wmH           = $wmW * ($imgDim[1] / $imgDim[0]);
    $pw            = $pdf->getPageWidth();
    $ph            = $pdf->getPageHeight();
    $pdf->SetAlpha(0.07);
    $pdf->Image('@' . $bin, ($pw - $wmW) / 2, ($ph - $wmH) / 2, $wmW, 0, 'PNG');
    $pdf->SetAlpha(1.0);
};
if ($logoData) {
    $drawLaudoWatermark($pdf, $bin);
}

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
if ($logoData) {
    $logoW = 45; // mismo ancho/proporción que profile.logo en PrintLaudoTemplate.tsx
    $pdf->Image('@' . $bin, ($pageWidth - $logoW) / 2, $logoTop, $logoW, 0, 'PNG');
}
$pdf->SetY($logoTop + 30);

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
// Marca de agua de la página 2 — antes del contenido (detrás del texto).
if ($logoData) {
    $drawLaudoWatermark($pdf, $bin);
}

if ($conclusao !== '') {
    $pdf->SetX($leftMargin);
    drawLaudoCheckbox($pdf, $conclusao === 'apto', 'Apto(a) para atividades laborais');
    $pdf->SetX($leftMargin);
    drawLaudoCheckbox($pdf, $conclusao === 'inapto_temporario', 'Inapto(a) temporariamente para atividades laborais');
    $pdf->SetX($leftMargin);
    drawLaudoCheckbox($pdf, $conclusao === 'inapto_definitivo', 'Inapto(a) definitivamente para atividades laborais');
    $pdf->SetY($pdf->GetY() + 4);
}

$pdf->writeHTML($htmlAfastamento, true, false, true, false, '');

// ── Pie anclado al fondo de la página en curso — mismo patrón que Atestados:
// arranca en una zona fija salvo que el contenido ya la alcance, en cuyo caso
// cede en vez de superponerse. Como el cuerpo puede paginar solo
// (SetAutoPageBreak), este pie termina en la página que haga falta — nunca
// fuerza un salto artificial extra.
//
// 120mm: acá entran el QR (drawQrVerificationBox, alto FIJO 50mm) + el bloque
// del médico (~14mm) + la línea legal ICP-Brasil (~25mm), con aire.
$footerZoneH = 120;
$footerY     = $pdf->getPageHeight() - $footerZoneH;
$pdf->SetY(max($pdf->GetY() + 8, $footerY));

// QR — igual que en PrintLaudoTemplate.tsx, sobre la firma del médico.
$qrY = drawQrVerificationBox($pdf, $leftMargin, $pdf->GetY(), 44, $r['qr_content'], $r['token']);
$pdf->SetY($qrY + 4);

$pdf->writeHTML($htmlDoctor, true, false, true, false, '');

// resolveSigner()+drawSignatureFooter()+signPdfOutput() por separado (en
// vez del atajo signAndDownloadPdf()) para poder pedirle a
// drawSignatureFooter() el formato puntual de Laudos: más aire después de
// la barra divisoria (hrMarginBottomMm) y la fecha en su propia línea
// (dateOnOwnLine) — sin tocar el comportamiento por default que usan
// Atestados/Encaminhamentos/Fórmulas Infantis con el mismo atajo.
$sig = resolveSigner($r['doctor_name'] ?: 'Médico');
drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel'], fontPt: 7.0, hrMarginBottomMm: 5.0, dateOnOwnLine: true);
signPdfOutput($pdf, 'laudo_' . $laudoId . '_assinado.pdf', $sig, 'laudos', $laudoId);

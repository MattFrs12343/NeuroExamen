<?php
// Reproducción fiel del flujo de signed-pdf.php con datos reales de la DB.
require_once 'C:/xampp/htdocs/neuro-api/config/database.php';
require_once 'C:/xampp/htdocs/neuro-api/lib/signing.php';
require_once 'C:/xampp/htdocs/neuro-api/lib/laudoProfiles.php';
require_once 'C:/xampp/htdocs/neuro-api/vendor/tecnickcom/tcpdf/tcpdf.php';

$pdo  = getDB();
$stmt = $pdo->prepare('SELECT * FROM laudos WHERE id = ?');
$stmt->execute(['LAU-2026-0011']);
$r = $stmt->fetch();
if (!$r) { echo "laudo no encontrado\n"; exit(1); }

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
$INK   = '#111827';
$MUTED = '#6B7280';
$LINE  = '#CBD5E1';

$pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
$pdf->SetCreator('NeuroExamenes');
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

// ── Marca de agua (mismo closure que signed-pdf.php) ──
$drawLaudoWatermark = function (TCPDF $pdf, string $bin, float $wmW = 140): void {
    $imgDim = getimagesizefromstring($bin);
    $wmH    = $wmW * ($imgDim[1] / $imgDim[0]);
    $pw     = $pdf->getPageWidth();
    $ph     = $pdf->getPageHeight();
    $pdf->SetAlpha(0.07);
    $pdf->Image('@' . $bin, ($pw - $wmW) / 2, ($ph - $wmH) / 2, $wmW, 0, 'PNG');
    $pdf->SetAlpha(1.0);
};

$logoData = getLaudoLogoDataUri($pdo, $r['template_id'], $r['clinic_name']);
echo "logoData: " . ($logoData ? 'YES (' . strlen($logoData) . ')' : 'NO') . "\n";
if ($logoData) {
    $bin = base64_decode(substr($logoData, strpos($logoData, ',') + 1));
    $drawLaudoWatermark($pdf, $bin);
}

// ── PÁGINA 1 ──
$logoTop = $pdf->GetY();
if ($logoData) {
    $logoW = 45;
    $bib   = base64_decode(substr($logoData, strpos($logoData, ',') + 1));
    $pdf->Image('@' . $bib, ($pageWidth - $logoW) / 2, $logoTop, $logoW, 0, 'PNG');
}
$pdf->SetY($logoTop + 30);
$pdf->writeHTML('<p style="text-align:center;font-size:14pt;font-weight:bold;letter-spacing:1pt;color:' . $INK . ';margin:0;">LAUDO PERICIAL MÉDICO</p>', true, false, true, false, '');
$pdf->SetY($pdf->GetY() + 2);
$pdf->writeHTML('<hr style="border-top:0.3mm solid ' . $LINE . ';" />', true, false, true, false, '');
$pdf->SetY($pdf->GetY() + 5);

$htmlPatient  = '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 1mm 0;"><b>Paciente:</b> ' . $patientLine . '</p>';
$htmlPatient .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 1mm 0;"><b>Data de Nascimento:</b> ' . $esc($formattedBirthDate ?: '') . '</p>';
$htmlPatient .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0;"><b>Documento (CPF):</b> ' . $esc($r['patient_identity_card'] ?: '') . '</p>';

$boxY = $pdf->GetY();
$boxH = 28;
$boxPad = 4;
$pdf->SetDrawColor(226, 232, 240);
$pdf->SetLineWidth(0.25);
$pdf->RoundedRect($leftMargin, $boxY, $contentW, $boxH, 1.5, '1111', 'D');
$pdf->SetXY($leftMargin + $boxPad, $boxY + $boxPad - 1.5);
$pdf->SetRightMargin($rightMargin + $boxPad);
$pdf->writeHTML($htmlPatient, true, false, true, false, '');
$pdf->SetRightMargin($rightMargin);
$pdf->SetY($boxY + $boxH + 6);

$baseInfo = getLaudoBaseInfo($pdo, $r['template_id'], $r['clinic_name']);
$htmlBody  = '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">Base de informações:</p>';
if ($baseInfo !== '') {
    $htmlBody .= '<p style="font-size:9.5pt;line-height:1.5;color:' . $INK . ';margin:0 0 4mm 0;">' . $esc($baseInfo) . '</p>';
} else {
    $htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 4mm 0;">&nbsp;</p>';
}
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 2mm 0;">' . $patientLine . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 4mm 0;">' . $esc($formattedDate ?: '') . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 2mm 0;">Ao medico-perito</p>';
$htmlBody .= '<p style="font-size:9.5pt;line-height:1.55;color:' . $INK . ';margin:0 0 4mm 0;">' . nl2br($esc($r['narrative'])) . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 5mm 0;">grato</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 3mm 0;"><b>Diagnóstico:</b> ' . $diagLine . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0;">Conclusão Pericial:</p>';

$pdf->writeHTML($htmlBody, true, false, true, false, '');

// ── PÁGINA 2 ──
if ($pdf->getPage() === 1) {
    $pdf->AddPage();
}
if ($logoData) {
    $drawLaudoWatermark($pdf, $bin);
}

$pdf->SetX($leftMargin);
$pdf->writeHTML('<p style="font-size:9.5pt;">Apto(a) para atividades laborais</p>', true, false, true, false, '');

$pdf->Output('C:/Users/Usuario/AppData/Local/Temp/opencode/wm-real.pdf', 'F');
echo "OK\n";
<?php
require_once 'C:/xampp/htdocs/neuro-api/vendor/tecnickcom/tcpdf/tcpdf.php';

$pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$leftMargin = 18;
$rightMargin = 18;
$pdf->SetMargins($leftMargin, 16, $rightMargin);

$logoData = 'data:image/png;base64,' . base64_encode(file_get_contents('C:/Users/Usuario/Downloads/NeuroExamen/server-php/assets/logo-saude-campinas.png'));

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

$pdf->SetAutoPageBreak(true, 16);
$pdf->AddPage();

$pdf->SetFont('freesans', '', 10);
$pageWidth = $pdf->getPageWidth();

// marca de agua página 1 — ANTES del contenido
if ($logoData) {
    $bin = base64_decode(substr($logoData, strpos($logoData, ',') + 1));
    $drawLaudoWatermark($pdf, $bin);
}

// membrete con el MISMO $bin que el watermark (como hace signed-pdf.php)
$logoTop = $pdf->GetY();
$weStillHaveLogo = $logoData;
if ($weStillHaveLogo) {
    $logoW = 45;
    $bin2  = base64_decode(substr($logoData, strpos($logoData, ',') + 1));
    $pdf->Image('@' . $bin2, ($pageWidth - $logoW) / 2, $logoTop, $logoW, 0, 'PNG');
}
$pdf->SetY($logoTop + 30);

// contenido página 1 (simula membrete + narrativa)
$pdf->writeHTML('<p style="text-align:center;font-size:14pt;">LAUDO PERICIAL MÉDICO</p>', true, false, true, false, '');
$pdf->writeHTML('<p style="font-size:9.5pt;">Paciente: NOMBRE DE PRUEBA BODY 1</p>', true, false, true, false, '');
$pdf->writeHTML('<p style="font-size:9.5pt;line-height:1.5;">' . str_repeat('Texto de narrativa del laudo pericial para llenar la primera pagina con contenido real. ', 25) . '</p>', true, false, true, false, '');
$pdf->writeHTML('<p style="font-size:9.5pt;"><b>Conclusão Pericial:</b></p>', true, false, true, false, '');

// ── PÁGINA 2 ──
if ($pdf->getPage() === 1) {
    $pdf->AddPage();
}
if ($logoData) {
    $drawLaudoWatermark($pdf, $bin);
}

$pdf->SetX($leftMargin);
$pdf->writeHTML('<p style="font-size:9.5pt;">Apto(a) para atividades laborais</p>', true, false, true, false, '');
$pdf->writeHTML('<p style="font-size:9.5pt;">Local e Data: Cidade, 15/09/2026</p>', true, false, true, false, '');

$pdf->Output('C:/Users/Usuario/AppData/Local/Temp/opencode/wm-test.pdf', 'F');
echo "OK pages=" . $pdf->getNumPages();
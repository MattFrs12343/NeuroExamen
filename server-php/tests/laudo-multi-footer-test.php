<?php
/**
 * Test sintético de la marca de agua + pie de firma por hoja — Laudos.
 *
 * Espejo del pipeline de api/laudos/signed-pdf.php SIN base de datos, SIN
 * autenticación y SIN certificado (el .pfx no está en el repo): usa la MISMA
 * clase LaudoWatermarkPdf, las MISMAS funciones drawQrVerificationBox() /
 * drawSignatureFooter() de lib/signing.php y el MISMO post-pass. Si cambia
 * el endpoint, actualizar acá.
 *
 *   php tests/laudo-multi-footer-test.php
 *   (env LAUDO_TEST_DUMP=1 → vuelca los buffers de página)
 *
 * Salida: repro-out/laudo-multi-footer-test.pdf
 * Luego:  node scripts/rasterize-pdf.mjs   (→ repro-out/pdf-raster/*.png)
 *
 * Assertions — todas leen el buffer CRUDO de cada hoja (TCPDF comprime recién
 * al hacer Output), es decir lo que de verdad quedó en el archivo:
 *
 *   1. Header() dejó el transform de la imagen de 140mm (396.85pt) en TODAS
 *      las hojas — el logo del membrete mide 45mm, no puede confundirse.
 *      Con el código viejo (marca dibujada a mano en 3 puntos) las hojas
 *      intermedias fallaban.
 *   2. El post-pase no creó hojas fantasma (getNumPages() == el de antes).
 *   3. Hojas 1..N−1: separador + QR + línea legal dentro de la banda
 *      y = 11.34..50.98pt (279..293mm desde arriba), y encabezado de
 *      continuidad en 2..N.
 *   4. Hoja N: NADA de eso — solo la firma completa.
 *      El cuerpo con SetAutoPageBreak(true,20) jamás baja de 56.69pt, así
 *      que "contenido de la banda" y "contenido del cuerpo" no se confunden:
 *      la aserción 3/4 mide de verdad que no hay solape.
 */
require_once __DIR__ . '/../lib/laudoWatermarkPdf.php';
require_once __DIR__ . '/../lib/signing.php';

// ── Contador: subclase de la REAL, no una copia ───────────────────────────
class CountingLaudoPdf extends LaudoWatermarkPdf {
    public int $headerCalls = 0;

    public function Header(): void {
        $this->headerCalls++;
        parent::Header();   // el código que corre en producción
    }

    /**
     * ¿La hoja $p lleva la marca de agua? Mira el buffer crudo de la página
     * (TCPDF comprime recién al hacer Output, así que acá está en claro) y
     * busca el transform de la imagen de 140mm = 396.85pt:
     *
     *     396.85 0 0 <alto> <x> <y> cm /ImN Do
     *
     * El logo del membrete es de 45mm (127.5pt), así que no puede confundir.
     * Es la comprobación del suelo: mira lo que QUEDÓ en el PDF, incluidas
     * las hojas descartadas por rollbackTransaction().
     */
    public function pageBuffer(int $p): string {
        return (string) $this->getPageBuffer($p);
    }

    public function watermarkOnPage(int $p): bool {
        $buf = $this->pageBuffer($p);
        // TCPDF escribe la matriz con 6 decimales ("396.850394"), por eso
        // 396\.\d+ y no 396\.85 fijo.
        return (bool) preg_match(
            '/396\.\d+\s+0\s+0\s+[\d.]+\s+[\d.-]+\s+[\d.-]+\s+cm\s*\/\S+\s+Do/',
            $buf
        );
    }
}

// ── Datos ─────────────────────────────────────────────────────────────────
$logoPath = __DIR__ . '/../assets/logo-saude-campinas.png';
if (!is_file($logoPath)) {
    fwrite(STDERR, "Falta $logoPath\n");
    exit(1);
}
$bin = file_get_contents($logoPath);

// Idénticos a los que salen del .pfx (readSigningCertificate()) y de la
// tabla laudos — el test no lee ninguno de los dos.
$sig = [
    'name'          => 'JUAN MARCELO CABELLO MERIDA LTDA',
    'document'      => '23.420.313/0001-02',
    'documentLabel' => 'CNPJ',
];
$signedAt     = date('d/m/Y H:i:s');
$qrContent    = 'https://pedidos.examenes-neuro.com/api/verificar/laudos/abc123def456ghi789';
$token        = 'abc123def456ghi789';
$accessCode   = '4821';
$patientName  = 'MARIA DA SILVA SOUZA (PREFEITURA MUNICIPAL DE FRANCO DA ROCHA)';
$clinicName   = 'CLINICA SAUDE CAMPINAS';
$clinicAddr   = 'Av. Norte-Sul, 1200 - Cambuí, Campinas/SP';
$clinicPhone  = '(19) 3252-4040';
$doctorName   = 'Dr. Juan Marcelo Cabello Mérida';
$doctorCrm    = 'CRM 161792 SP';

$INK   = '#111827';
$MUTED = '#6B7280';
$LINE  = '#CBD5E1';

// ── Contenido: narrativa y observações LARGAS a propósito ─────────────────
// El bug original solo aparece cuando TCPDF tiene que crear páginas solo
// (checkPageBreak). Con poco texto el documento sale de 2 páginas y las dos
// reciben marca "por suerte" — por eso el test fuerza 4+ hojas.
$frase = 'O paciente compareceu à data deste exame relatando cefaleia occipital '
       . 'intermitente, associada a episódios de tontura postural e sensação de '
       . 'instabilidade ao deitar e levantar, sem sinais de déficit neurológico '
       . 'focal à inspeção e sem alterações de força ou tônus. ';
$fraseObs = 'Paciente orientado no tempo e no espaço, colaborador durante toda a '
          . 'entrevista, sem indícios de simulação. Refere melhora parcial dos '
          . 'sintomas com repouso e piora aos esforços prolongados. ';

$repeat = fn(string $s, int $n) => str_repeat($s, $n);

$baseInfo = 'Queixa principal: cefaleia e tontura há 3 meses. História da doença '
          . 'atual: início insidioso, sem trauma craniano prévio. Antecedentes: '
          . 'hipertensão arterial em uso de losartana. Exame físico: PA 14x9, '
          . 'freq. cardíaca 78 bpm, sem déficits.';

$patientLine = $patientName;
$diagLine    = 'CID: G43.9; R51';

// ── HTML — misma construcción del endpoint ────────────────────────────────
$htmlPatient  = '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 1mm 0;"><b>Paciente:</b> ' . $patientLine . '</p>';
$htmlPatient .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 1mm 0;"><b>Data de Nascimento:</b> 14/03/1978</p>';
$htmlPatient .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0;"><b>Documento (CPF):</b> 123.456.789-00</p>';

$htmlBody  = '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">Base de informações:</p>';
$htmlBody .= '<p style="font-size:9.5pt;line-height:1.5;color:' . $INK . ';margin:0 0 3mm 0;">' . $baseInfo . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 2mm 0;">' . $patientLine . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 3mm 0;">06/10/2026</p>';
$htmlBody .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 2mm 0;">Ao medico-perito</p>';
$htmlBody .= '<p style="font-size:9.5pt;line-height:1.55;color:' . $INK . ';margin:0 0 3mm 0;">' . $repeat($frase, 70) . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 3mm 0;">grato</p>';
$htmlBody .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 3mm 0;"><b>Diagnóstico:</b> ' . $diagLine . '</p>';
$htmlBody .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0;">Conclusão Pericial:</p>';

$htmlAfastamento  = '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">Período sugerido de afastamento (quando aplicável):</p>';
$htmlAfastamento .= '<p style="font-size:9.5pt;color:' . $INK . ';margin:0 0 2mm 0;">De: <b>15 DIAS</b></p>';
$htmlAfastamento .= '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">Observações Adicionais:</p>';
$htmlAfastamento .= '<p style="font-size:9.5pt;line-height:1.45;color:' . $INK . ';margin:0 0 3mm 0;">' . $repeat($fraseObs, 45) . '</p>';

$localData     = 'Campinas/SP, ' . substr($signedAt, 0, 10);
$htmlFirmDecor  = '<p style="font-size:9.5pt;font-weight:bold;color:' . $INK . ';margin:0;">Local e Data: <span style="font-weight:normal;">' . $localData . '</span></p>';
$htmlFirmDecor .= '<hr style="border-top:0.3mm solid ' . $LINE . ';margin:3mm 0;" />';
$htmlFirmDecor .= '<p style="font-size:9pt;font-weight:bold;color:' . $INK . ';margin:0 0 1mm 0;">' . $clinicName . '</p>';
$htmlFirmDecor .= '<p style="font-size:8pt;color:' . $MUTED . ';margin:0 0 1mm 0;">' . $clinicAddr . '</p>';
$htmlFirmDecor .= '<p style="font-size:8pt;color:' . $MUTED . ';margin:0;">' . $clinicPhone . '</p>';

$htmlDoctor  = '<p style="text-align:center;font-size:10pt;font-weight:bold;color:' . $INK . ';margin:0;line-height:1.25;">' . $doctorName . '</p>';
$htmlDoctor .= '<p style="text-align:center;font-size:9pt;color:' . $MUTED . ';margin:0.5mm 0 0 0;line-height:1.2;">' . $doctorCrm . '</p>';

// ── PDF ───────────────────────────────────────────────────────────────────
$pdf = new CountingLaudoPdf('P', 'mm', 'A4', true, 'UTF-8', false);
$pdf->wmBin = $bin;
$pdf->SetCreator('NeuroExamenes - test');
$pdf->SetTitle('Laudo pericial — test marca de agua + pie por hoja');
$pdf->setPrintHeader(true);
$pdf->setPrintFooter(false);

$leftMargin  = 18;
$rightMargin = 18;
$pdf->SetMargins($leftMargin, 20, $rightMargin);
$pdf->SetAutoPageBreak(true, 20);
$pdf->AddPage();
$pdf->SetFont('freesans', '', 10);

$pageWidth = $pdf->getPageWidth();
$contentW  = $pageWidth - $leftMargin - $rightMargin;

// Membrete (idéntico al endpoint)
$logoTop = $pdf->GetY();
$logoH   = 0;
$imgDim  = getimagesizefromstring($bin);
$scale   = min(45 / $imgDim[0], 29 / $imgDim[1]);
$logoW   = $imgDim[0] * $scale;
$logoH   = $imgDim[1] * $scale;
$pdf->Image('@' . $bin, ($pageWidth - $logoW) / 2, $logoTop, $logoW, $logoH, 'PNG');
$pdf->SetY($logoTop + max(30, $logoH + 4));

$pdf->writeHTML('<p style="text-align:center;font-size:14pt;font-weight:bold;letter-spacing:1pt;color:' . $INK . ';margin:0;">LAUDO PERICIAL MÉDICO</p>', true, false, true, false, '');
$pdf->SetY($pdf->GetY() + 2);
$pdf->writeHTML('<hr style="border-top:0.3mm solid ' . $LINE . ';" />', true, false, true, false, '');
$pdf->SetY($pdf->GetY() + 5);

// Caja de paciente
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

if ($pdf->getPage() === 1) {
    $pdf->AddPage();
}

// Checkboxes (los pinta la página 2)
$pdf->SetX($leftMargin);
drawLaudoCheckboxTest($pdf, true, 'Apto(a) para atividades laborais');
$pdf->SetX($leftMargin);
drawLaudoCheckboxTest($pdf, false, 'Inapto(a) temporariamente para atividades laborais');
$pdf->SetX($leftMargin);
drawLaudoCheckboxTest($pdf, false, 'Inapto(a) definitivamente para atividades laborais');
$pdf->SetY($pdf->GetY() + 4);

$pdf->writeHTML($htmlAfastamento, true, false, true, false, '');

// Bloque de firma con transacción (mismo guard que el endpoint)
$pdf->startTransaction();
$blockStartPage = $pdf->getPage();
$pdf->writeHTML($htmlFirmDecor, true, false, true, false, '');
$qrY = drawQrVerificationBox($pdf, $leftMargin, $pdf->GetY() + 8, 44, $qrContent, $token, $accessCode);
$pdf->SetY($qrY + 4);
$pdf->writeHTML($htmlDoctor, true, false, true, false, '');
drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel'], fontPt: 7.0, hrMarginBottomMm: 5.0, dateOnOwnLine: true, signedAt: $signedAt);
if ($pdf->getPage() !== $blockStartPage || $pdf->GetY() > $pdf->getPageHeight() - 20) {
    $pdf->rollbackTransaction(true);
    $pdf->AddPage();
    $pdf->writeHTML($htmlFirmDecor, true, false, true, false, '');
    $qrY = drawQrVerificationBox($pdf, $leftMargin, $pdf->GetY() + 8, 44, $qrContent, $token, $accessCode);
    $pdf->SetY($qrY + 4);
    $pdf->writeHTML($htmlDoctor, true, false, true, false, '');
    drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel'], fontPt: 7.0, hrMarginBottomMm: 5.0, dateOnOwnLine: true, signedAt: $signedAt);
}

// ── POST-PASS — copia literal del endpoint ────────────────────────────────
$numPages = $pdf->getNumPages();
$lastPage = $pdf->getPage();
$hdrPad   = 18;
$pageW    = $pdf->getPageWidth();
$availW   = $pageW - 2 * $hdrPad;
$cellW    = $availW - 30;

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

$bandTop = 279;
$bandH   = 14;
$qrMini  = 13;
$miniX   = $leftMargin + $qrMini + 3;
$miniW   = $pageW - $rightMargin - $miniX;
$lineH   = 2.6;

// setPage($p) restaura AutoPageBreak y bMargin desde pagedim (tcpdf.php), así
// que el setAutoPageBreak tiene que ir DESPUÉS de setPage, y con margen 0 para
// que PageBreakTrigger = 297 y MultiCell no entre en su rama de "split cell"
// (que solo mira PageBreakTrigger, no AutoPageBreak) con y = 283.4.
for ($p = 1; $p <= $numPages; $p++) {
    $pdf->setPage($p);
    $pdf->setAutoPageBreak(false, 0);

    if ($p > 1) {
        $fullText = 'Paciente: ' . $patientName;
        $pdf->SetFont('freesans', '', 8);
        if ($pdf->GetStringWidth($fullText) > $cellW) {
            $maxW = $cellW;
            while ($fullText !== '' && $pdf->GetStringWidth($fullText) > $maxW) {
                $fullText = preg_replace('/.$/u', '', $fullText);
            }
            $fullText = rtrim($fullText) . '…';
        }
        $pdf->SetTextColor(107, 114, 128);
        $pdf->SetXY($hdrPad, 8);
        $pdf->Cell($cellW, 4, $fullText, 0, 0, 'L');

        $pdf->SetFont('freesans', '', 7.5);
        $pdf->SetTextColor(156, 163, 175);
        $pdf->SetXY($pageW - $hdrPad, 8);
        $pdf->Cell(0, 4, 'Página ' . $p . ' de ' . $numPages, 0, 1, 'R');

        $pdf->SetDrawColor(226, 232, 240);
        $pdf->SetLineWidth(0.2);
        $pdf->Line($hdrPad, 15, $pageW - $hdrPad, 15);
    }

    if ($p < $numPages) {
        $pdf->SetDrawColor(226, 232, 240);
        $pdf->SetLineWidth(0.2);
        $pdf->Line($leftMargin, $bandTop - 0.5, $pageW - $rightMargin, $bandTop - 0.5);

        $pdf->write2DBarcode($qrContent, 'QRCODE,H', $leftMargin, $bandTop + ($bandH - $qrMini) / 2, $qrMini, $qrMini, [], 'N');

        $pdf->SetFont('freesans', '', 6);
        $pdf->SetTextColor(107, 114, 128);
        $miniLines = max(1, $pdf->getNumLines($miniLegalText, $miniW));
        $miniY     = $bandTop + max(0, ($bandH - $miniLines * $lineH) / 2);
        if (getenv('LAUDO_TEST_DUMP')) {
            printf(
                "  [p=%d] ANTES: y=%s x=%s h=%s  miniX=%s miniY=%s lines=%d\n",
                $p, $pdf->getY(), $pdf->getX(), $pdf->getPageHeight(), $miniX, $miniY, $miniLines
            );
        }
        $pdf->MultiCell($miniW, $lineH, $miniLegalText, 0, 'C', false, 1, $miniX, $miniY);
        if (getenv('LAUDO_TEST_DUMP')) {
            printf("  [p=%d] DESPUES: y=%s x=%s\n", $p, $pdf->getY(), $pdf->getX());
        }
    }
}
$pdf->setAutoPageBreak(true, 20);
$pdf->setPage($lastPage);
$pdf->SetTextColor(0, 0, 0);
$pdf->SetFont('freesans', '', 10);

// ── Salida + assertions ───────────────────────────────────────────────────
// Se captura ANTES de Output(): TCPDF cierra el documento con
// _destroy(true), que hace unset() de TODAS las propiedades de la instancia
// (incluida la nuestra) — leerlas después tira
// "Typed property must not be accessed before initialization".
$headerCalls  = $pdf->headerCalls;
$actualPages = $pdf->getNumPages();   // hojas VIVAS después del post-pase
$wmPages      = [];
$bufPages    = [];
for ($p = 1; $p <= $numPages; $p++) {
    $bufPages[$p] = $pdf->pageBuffer($p);
    $wmPages[$p]  = $pdf->watermarkOnPage($p);
}

if (getenv('LAUDO_TEST_DUMP')) {
    printf(
        "\nnumPages=%d leftMargin=%s rightMargin=%s pageW=%s miniX=%s miniW=%s miniY=%s miniLines=%d\n",
        $numPages, $leftMargin, $rightMargin, $pageW, $miniX, $miniW, $miniY, $miniLines
    );
    foreach ($bufPages as $p => $buf) {
        echo "\n================ PAGE {$p}  (len " . strlen($buf) . ") ================\n";
        echo 'sep=' . (strpos($buf, '52.441181 m') !== false ? 'SI' : 'NO')
            . '  cont799=' . (strpos($buf, '799.370315 m') !== false ? 'SI' : 'NO')
            . '  re=' . preg_match_all('/\bre\b/', $buf)
            . '  f6=' . preg_match_all('#/F2 6\.000000 Tf#', $buf) . "\n";
        $needle = '';
        foreach (str_split('Assinado digitalmente') as $ch) {
            $needle .= "\x00" . $ch;
        }
        $i = 0;
        $n = 0;
        while (($i = strpos($buf, $needle, $i)) !== false && $n < 4) {
            echo "  'Assinado digitalmente' @ offset {$i}; 300 chars ANTES:\n    "
                . preg_replace('/[\x00-\x1F]+/', '.', substr($buf, $i - 300, 300)) . "\n";
            $i += strlen($needle);
            $n++;
        }
        if ($n === 0) {
            echo "  'Assinado digitalmente' AUSENTE\n";
        }
    }
}

$outDir = realpath(__DIR__ . '/../../repro-out');
if ($outDir === false) {
    $outDir = __DIR__ . '/../../repro-out';
    if (!is_dir($outDir)) {
        mkdir($outDir, 0777, true);
    }
}
$outFile = rtrim($outDir, '/\\') . DIRECTORY_SEPARATOR . 'laudo-multi-footer-test.pdf';
$pdf->Output($outFile, 'F');

$fail = 0;

// Y en POINTS desde el borde inferior, tal como TCPDF los escribe en el
// buffer de la página. La banda del pie mini ocupa y = 279..293mm desde el
// borde SUPERIOR → 4..18mm desde el inferior → 11.34..50.98pt. El cuerpo con
// SetAutoPageBreak(true, 20) jamás baja de 20mm = 56.69pt, así que "algo en
// la banda" y "algo del cuerpo" no pueden confundirse.
$bandYMin = (297 - 293) * 72 / 25.4;
$bandYMax = (297 - 279) * 72 / 25.4;

$needle = '';
foreach (str_split('Assinado digitalmente') as $ch) {
    $needle .= "\x00" . $ch;   // UTF-16BE, alto byte primero
}

/** Último operando y de un `Td` que precede a $offset, o null. */
$tdYBefore = static function (string $buf, int $offset): ?float {
    $chunk = substr($buf, max(0, $offset - 500), min(500, $offset));
    if (!preg_match_all('/[\d.]+ ([\d.-]+) Td/', $chunk, $m)) {
        return null;
    }
    return (float) end($m[1]);
};

/** ¿Hay un rectángulo relleno (módulo del QR) dentro de la banda del pie? */
$qrInBand = static function (string $buf) use ($bandYMin, $bandYMax): bool {
    if (!preg_match_all('/[\d.]+ ([\d.]+) [\d.]+ -[\d.]+ re f/', $buf, $m)) {
        return false;
    }
    foreach ($m[1] as $y) {
        if ((float) $y >= $bandYMin - 1 && (float) $y <= $bandYMax + 1) {
            return true;
        }
    }
    return false;
};

// ── Problema 1: la marca de agua en TODAS las hojas ───────────────────────
$missing = [];
foreach ($wmPages as $p => $has) {
    if (!$has) {
        $missing[] = $p;
    }
}
if ($missing) {
    fwrite(STDERR, 'FAIL marca de agua ausente en la hoja(s): ' . implode(', ', $missing) . "\n");
    $fail++;
} else {
    echo "OK  marca de agua presente en las {$numPages} hojas (1.." . $numPages . ")\n";
}

// Header() se invoca UNA vez por cada hoja CREADA. Con setPrintHeader(false)
// esto cae a 0 y falla.
if ($headerCalls < $numPages) {
    fwrite(STDERR, "FAIL Header() corrió solo {$headerCalls} veces para {$numPages} hojas (¿setPrintHeader(false)?)\n");
    $fail++;
} else {
    echo "OK  Header() invocado {$headerCalls} veces\n";
}

// El post-pase no puede crear ni destruir hojas: setPage() restaura
// AutoPageBreak desde pagedim, y si el setAutoPageBreak queda fuera del loop
// aparece una hoja fantasma por iteración.
if ($actualPages !== $numPages) {
    fwrite(STDERR, "FAIL: el post-pase dejó {$actualPages} hojas (se esperaban {$numPages})\n");
    $fail++;
} else {
    echo "OK  sin hojas fantasma tras el post-pase ({$actualPages} hojas)\n";
}

// ── Problema 2: pie mini en 1..N−1, firma completa solo en N ──────────────
foreach ($bufPages as $p => $buf) {
    $isLast   = ($p === $numPages);
    $wantMini = !$isLast;

    $sep   = strpos($buf, '52.441181 m') !== false;
    $cont  = strpos($buf, '799.370315 m') !== false;
    $qr    = $qrInBand($buf);

    // "Assinado digitalmente" puede aparecer más de una vez (el pie completo
    // de la última hoja lo dice también): lo que importa es si aparece EN LA
    // BANDA, que es donde solo puede haberlo puesto el pie mini.
    $text  = false;
    $tiY   = null;
    $off   = 0;
    while (($ti = strpos($buf, $needle, $off)) !== false) {
        $y = $tdYBefore($buf, $ti);
        if ($y !== null && $y >= $bandYMin - 1 && $y <= $bandYMax + 1) {
            $text = true;
            $tiY  = $y;
            break;
        }
        $off = $ti + 1;
    }

    $probs = [];
    if ($sep !== $wantMini) {
        $probs[] = ($wantMini ? 'falta' : 'no debería tener') . ' separador';
    }
    if ($qr !== $wantMini) {
        $probs[] = ($wantMini ? 'falta' : 'no debería tener') . ' QR en la banda';
    }
    if ($text !== $wantMini) {
        $probs[] = ($wantMini ? 'falta' : 'no debería tener') . ' texto legal en la banda'
            . ($tiY === null ? '' : sprintf(' (Td y=%s)', round($tiY, 2)));
    }
    if ($cont !== ($p > 1)) {
        $probs[] = ($p > 1 ? 'falta' : 'no debería tener') . ' encabezado de continuidad';
    }

    // ¿Entró texto del CUERPO dentro de la banda del pie? El cuerpo escribe
    // siempre en x = 51.02 (18mm); el pie mini en x ≥ 99.2 (34mm + padding).
    // Si esto suelta algo, el solape que pedimos evitar es real.
    $intruso = [];
    if (preg_match_all('/([\d.]+) ([\d.]+) Td/', $buf, $tm)) {
        foreach ($tm[0] as $k => $ignored) {
            $tx = (float) $tm[1][$k];
            $ty = (float) $tm[2][$k];
            if ($ty >= $bandYMin - 1 && $ty <= $bandYMax + 1 && $tx < 90) {
                $intruso[] = sprintf('x=%s y=%s', round($tx, 2), round($ty, 2));
            }
        }
    }
    if ($intruso) {
        $probs[] = 'texto del cuerpo DENTRO de la banda: ' . implode(', ', $intruso);
    }

    if ($probs) {
        fwrite(STDERR, "FAIL hoja {$p}: " . implode('; ', $probs) . "\n");
        $fail++;
    } else {
        $label = $isLast ? 'firma completa (sin pie mini)' : 'pie mini (QR + línea legal)';
        echo "OK  hoja {$p}: {$label}\n";
    }
}

// El test solo sirve si el documento realmente tiene varias hojas: con 1-2
// hojas el bug viejo no se habría manifestado nunca.
if ($numPages < 3) {
    fwrite(STDERR, "FAIL: el laudo de test salió de {$numPages} página(s); necesita 3+ para ejercitar el bug\n");
    $fail++;
} else {
    echo "OK  documento de {$numPages} hojas (escenario intermedio cubierto)\n";
}

echo "OK  escrito: $outFile\n";
echo "    último pie (hoja {$numPages}) = firma completa; hojas 1.." . ($numPages - 1) . " = pie mini\n";
exit($fail === 0 ? 0 : 1);

/**
 * Checkbox cuadrado — copia de drawLaudoCheckbox() del endpoint (es una
 * función global ahí; acá no podemos redeclararla si se incluye el endpoint,
 * así que lleva otro nombre).
 */
function drawLaudoCheckboxTest(TCPDF $pdf, bool $checked, string $label, float $fontPt = 9.5): void {
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

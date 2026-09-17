<?php
/**
 * GET /api/formula-leite/{id}/signed-pdf
 * Genera o PDF da ficha "Fórmulas Infantis Especiais" — transcrição do
 * formulário oficial SES-SP (mesmas seções A-F que PrintFormulaLeiteTemplate.tsx)
 * — e assina digitalmente (PAdES) com o certificado do médico.
 * Mesmo padrão que api/atestados/signed-pdf.php (ver esse arquivo para as
 * notas longas sobre fonte embutida, margens, rodapé de firma, etc.).
 *
 * Diferenças desta seção em relação às outras 4:
 *  - Não há dados de clínica com perfil completo (institution_name é texto
 *    livre, sem endereço/telefone/CNPJ próprios) — o endereço do rodapé
 *    sempre usa DOCTOR_ADDRESS fixo.
 *  - Não há doctor_name/doctor_crm — o rodapé da própria ficha já mostra
 *    "CNS/CPF do médico responsável" (campos do formulário original); a
 *    linha legal de firma (adicionada automaticamente por
 *    signAndDownloadPdf) usa o nome real do certificado, não CRM.
 *  - O documento tem 2 páginas (igual à ficha original em papel).
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/signing.php';
require_once __DIR__ . '/../../lib/doctor.php';
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

$path  = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts = explode('/', $path);
$idx   = array_search('formula-leite', $parts);
$docId = ($idx !== false && isset($parts[$idx + 1])) ? $parts[$idx + 1] : null;

if (!$docId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'ID de ficha no especificado.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('
    SELECT f.*, p.name AS patient_name
    FROM formula_leite f
    JOIN patients p ON p.id = f.patient_id
    WHERE f.id = ?
');
$stmt->execute([$docId]);
$f = $stmt->fetch();

if (!$f) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['error' => 'Ficha não encontrada.']);
    exit;
}

resolveVerificationUrl($pdo, 'formula_leite', 'formula-leite', $docId, $f);

$symptoms = $f['symptoms'] ? json_decode($f['symptoms'], true) : [];
$exams    = $f['exams']    ? json_decode($f['exams'],    true) : [];
$nutritionHistory = $f['nutrition_history'] ? json_decode($f['nutrition_history'], true) : [];
$formulaTypes     = $f['formula_types']     ? json_decode($f['formula_types'],     true) : [];

const SYMPTOM_CATEGORY_ORDER  = ['cutaneos', 'gastrintestinais', 'respiratorios', 'outros'];
const SYMPTOM_CATEGORY_LABELS = [
    'cutaneos'         => 'Sintomas cutâneos',
    'gastrintestinais' => 'Sintomas gastrintestinais',
    'respiratorios'    => 'Sintomas respiratórios',
    'outros'           => 'Outros',
];
const EXAM_CATEGORY_ORDER  = ['hipersensibilidade', 'gastrointestinal', 'anatomopatologico', 'outros'];
const EXAM_CATEGORY_LABELS = [
    'hipersensibilidade' => 'Hipersensibilidade',
    'gastrointestinal'   => 'Avaliação gastrointestinal',
    'anatomopatologico'  => 'Anatomopatológico',
    'outros'              => 'Outros    Provocação',
];

function groupByCategory(array $items, array $order): array {
    $groups = [];
    foreach ($order as $cat) {
        $inCat = array_filter($items, fn($it) => ($it['category'] ?? '') === $cat);
        if ($inCat) { $groups[$cat] = array_values($inCat); }
    }
    return $groups;
}

/**
 * Versão compacta do cartão de verificação (QR), usada aqui ao lado dos
 * subitens de F) Conduta — menor que drawQrVerificationBox() (que é
 * compartilhada com as outras 4 seções) porque o espaço ao lado de F é bem
 * mais estreito que a coluna de PACIENTE das outras fichas.
 */
function drawCompactQrBox(TCPDF $pdf, float $x, float $y, float $w, string $verifyUrl, string $token): float {
    $pad    = 2;
    $innerW = $w - 2 * $pad;
    $cardH  = 30;

    $pdf->SetFillColor(247, 250, 252);
    $pdf->SetDrawColor(203, 213, 225);
    $pdf->RoundedRect($x, $y, $w, $cardH, 1.5, '1111', 'DF');

    $curY = $y + $pad + 1;
    $pdf->SetFont('freesans', 'B', 5.5);
    $pdf->SetTextColor(15, 76, 129);
    $pdf->MultiCell($innerW, 0, 'Verifique a assinatura digital', 0, 'C', false, 1, $x + $pad, $curY);
    $curY = $pdf->GetY() + 1;

    $qrSize = min(16, $innerW);
    $qrX    = $x + ($w - $qrSize) / 2;
    $pdf->write2DBarcode($verifyUrl, 'QRCODE,H', $qrX, $curY, $qrSize, $qrSize, [], 'N');
    $curY += $qrSize + 1.5;

    $pdf->SetFont('freesans', 'B', 5.5);
    $pdf->MultiCell($innerW, 0, 'Código: ' . $token, 0, 'C', false, 1, $x + $pad, $curY);

    $pdf->SetFont('freesans', '', 9);
    $pdf->SetTextColor(0, 0, 0);
    return $y + $cardH;
}

// ------------------------------------------------------------------
$esc   = fn($v) => htmlspecialchars((string) ($v ?? ''), ENT_QUOTES, 'UTF-8');
$formatDate = function (?string $iso): ?string {
    if ($iso === null || trim($iso) === '') return null;
    $p = explode('-', $iso);
    return count($p) === 3 ? "{$p[2]}/{$p[1]}/{$p[0]}" : $iso;
};
$box   = fn($checked, $label) => '(' . ($checked ? 'X' : '&nbsp;') . ') ' . $esc($label);
$INK   = '#111111';
$MUTED = '#6B7280';
$FAINT = '#9CA3AF';
$LINE  = '#CBD5E1';

// ── Masthead (idêntico ao original: título centrado dentro de uma caixa) ──
$htmlMasthead = '<table cellpadding="4" style="width:100%;border:0.4mm solid black;font-size:8pt;">'
    . '<tr><td style="text-align:center;border-bottom:0.3mm solid black;">'
    . '<p style="margin:0;font-size:12pt;font-weight:bold;">FORMULAS INFANTIS ESPECIAIS</p>'
    . '<p style="margin:2px 0 0 0;font-size:11pt;font-weight:bold;">FICHA DE AVALIAÇÃO PARA FORNECIMENTO</p>'
    . '</td></tr>'
    . '<tr><td style="text-align:center;font-size:8pt;font-style:italic;color:' . $MUTED . ';">'
    . '(Deve ser preenchida pelo médico que acompanha a criança até o item E)</td></tr>'
    . '</table>';

// ── Seção A) Identificação — coluna esquerda ao lado do QR ────────────────
$htmlPatientName  = '<p style="font-size:7pt;font-weight:bold;color:' . $FAINT . ';margin-bottom:0;">PACIENTE</p>';
$htmlPatientName .= '<p style="font-size:15pt;font-weight:bold;color:' . $INK . ';margin-top:1mm;">' . strtoupper($esc($f['patient_name'])) . '</p>';

$htmlSectionA  = '<p style="font-size:7pt;font-weight:bold;color:' . $FAINT . ';letter-spacing:0.03em;margin:2mm 0 0 0;">DATA DA PRIMEIRA CONSULTA</p>';
$htmlSectionA .= '<p style="font-size:10pt;font-weight:bold;color:' . $INK . ';margin:0.5mm 0 0 0;">' . $esc($formatDate($f['first_consult_date']) ?: '—') . '</p>';

$htmlSectionA .= '<table cellpadding="1" style="font-size:8pt;margin-top:3mm;"><tr>';
$htmlSectionA .= '<td width="50%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">NASCIMENTO</span><br/>' . $esc($formatDate($f['patient_birth_date']) ?: '—') . '</td>';
$htmlSectionA .= '<td width="50%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">CNS DO PACIENTE</span><br/>' . $esc($f['patient_cns'] ?: '—') . '</td>';
$htmlSectionA .= '</tr></table>';

if ($f['mother_name']) {
    $htmlSectionA .= '<p style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';margin:2mm 0 0 0;">NOME DA MÃE</p>';
    $htmlSectionA .= '<p style="font-size:9pt;color:' . $INK . ';margin-top:0;">' . $esc($f['mother_name']) . '</p>';
}

$htmlSectionA .= '<p style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';margin:2mm 0 0 0;">NOME DO PROFISSIONAL</p>';
$htmlSectionA .= '<p style="font-size:9pt;color:' . $INK . ';margin-top:0;">' . $esc($f['professional_name'] ?: '—') . '</p>';

$htmlSectionA .= '<table cellpadding="1" style="font-size:8pt;margin-top:2mm;"><tr>';
$htmlSectionA .= '<td width="65%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">INSTITUIÇÃO</span><br/>' . $esc($f['institution_name'] ?: '—') . '</td>';
$htmlSectionA .= '<td width="35%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">CNES</span><br/>' . $esc($f['cnes'] ?: '—') . '</td>';
$htmlSectionA .= '</tr></table>';

$htmlSectionA .= '<table cellpadding="1" style="font-size:8pt;margin-top:2mm;"><tr>';
$htmlSectionA .= '<td width="65%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">SOLICITAÇÃO</span><br/>' . $esc($f['solicitation'] ?: '—') . '</td>';
$htmlSectionA .= '<td width="35%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">QUANTIDADE/MÊS</span><br/>' . $esc($f['quantity_month'] ?: '—') . '</td>';
$htmlSectionA .= '</tr></table>';

$htmlSectionA .= '<table cellpadding="1" style="font-size:8pt;margin-top:2mm;"><tr>';
$htmlSectionA .= '<td width="25%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">CID</span><br/>' . $esc($f['cid'] ?: '—') . '</td>';
$htmlSectionA .= '<td width="75%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">DIAGNÓSTICO</span><br/>' . $esc($f['diagnostico'] ?: '—') . '</td>';
$htmlSectionA .= '</tr></table>';

// ── Seção B) Sinais e sintomas — tabela completa, largura total ──────────
$symptomGroups = groupByCategory($symptoms, SYMPTOM_CATEGORY_ORDER);
$htmlB  = '<table border="1" cellpadding="2" style="width:100%;font-size:7pt;border-color:#94A3B8;">';
$htmlB .= '<tr>'
    . '<td width="30%" style="font-weight:bold;background-color:#F1F5F9;"></td>'
    . '<td width="12%" style="font-weight:bold;background-color:#F1F5F9;text-align:center;">Idade inicial</td>'
    . '<td width="13%" style="font-weight:bold;background-color:#F1F5F9;text-align:center;">Tempo latência</td>'
    . '<td width="11%" style="font-weight:bold;background-color:#F1F5F9;text-align:center;">Duração</td>'
    . '<td width="12%" style="font-weight:bold;background-color:#F1F5F9;text-align:center;">Frequência</td>'
    . '<td width="11%" style="font-weight:bold;background-color:#F1F5F9;text-align:center;">Último episódio</td>'
    . '<td width="11%" style="font-weight:bold;background-color:#F1F5F9;text-align:center;">Tratamento</td>'
    . '</tr>';
foreach ($symptomGroups as $cat => $items) {
    $htmlB .= '<tr><td colspan="7" style="font-weight:bold;background-color:#E2E8F0;">' . $esc(SYMPTOM_CATEGORY_LABELS[$cat]) . '</td></tr>';
    foreach ($items as $s) {
        $htmlB .= '<tr>'
            . '<td>' . $box(!empty($s['checked']), $s['label'] ?? '') . '</td>'
            . '<td>' . $esc($s['idadeInicial'] ?? '') . '</td>'
            . '<td>' . $esc($s['tempoLatencia'] ?? '') . '</td>'
            . '<td>' . $esc($s['duracao'] ?? '') . '</td>'
            . '<td>' . $esc($s['frequencia'] ?? '') . '</td>'
            . '<td>' . $esc($s['ultimoEpisodio'] ?? '') . '</td>'
            . '<td>' . $esc($s['tratamento'] ?? '') . '</td>'
            . '</tr>';
    }
}
$htmlB .= '</table>';
$htmlB .= '<p style="font-size:6.5pt;color:' . $MUTED . ';margin:1mm 0 0 0;">* Tempo necessário entre a ingestão do alimento e o aparecimento dos sintomas</p>';

$htmlSymptomsNotes  = '<p style="font-size:8pt;font-weight:bold;margin:3mm 0 1mm 0;">Especifique os sintomas mais exacerbados</p>';
$htmlSymptomsNotes .= '<table border="1" cellpadding="3" style="width:100%;font-size:8pt;border-color:#94A3B8;"><tr><td style="min-height:12mm;">' . richTextToHtml($f['symptoms_notes']) . '</td></tr></table>';

// ── Seção C) Exames subsidiários — página 2 ───────────────────────────────
$examGroups = groupByCategory($exams, EXAM_CATEGORY_ORDER);
$htmlC  = '<table border="1" cellpadding="2" style="width:100%;font-size:7pt;border-color:#94A3B8;">';
$htmlC .= '<tr>'
    . '<td width="70%" style="font-weight:bold;background-color:#F1F5F9;">Tipo</td>'
    . '<td width="12%" style="font-weight:bold;background-color:#F1F5F9;text-align:center;">Data</td>'
    . '<td width="18%" style="font-weight:bold;background-color:#F1F5F9;text-align:center;">Resultado</td>'
    . '</tr>';
foreach ($examGroups as $cat => $items) {
    $htmlC .= '<tr><td colspan="3" style="font-weight:bold;background-color:#E2E8F0;">' . $esc(EXAM_CATEGORY_LABELS[$cat]) . '</td></tr>';
    foreach ($items as $e) {
        $label = $cat === 'outros'
            ? $esc($e['label'] ?? '')
            : '(' . (($e['sim'] ?? null) === true ? 'X' : '&nbsp;') . ') Sim&nbsp;&nbsp;(' . (($e['sim'] ?? null) === false ? 'X' : '&nbsp;') . ') Não&nbsp;&nbsp;' . $esc($e['label'] ?? '');
        $htmlC .= '<tr>'
            . '<td>' . $label . '</td>'
            . '<td>' . $esc($e['data'] ?? '') . '</td>'
            . '<td>' . $esc($e['resultado'] ?? '') . '</td>'
            . '</tr>';
    }
}
$htmlC .= '</table>';

// ── Seção D) Avaliação nutricional ────────────────────────────────────────
$htmlD  = '<table cellpadding="1" style="font-size:9pt;"><tr>';
$htmlD .= '<td width="50%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">PESO</span><br/>' . $esc($f['weight_kg'] ? $f['weight_kg'] . ' kg' : '—') . '</td>';
$htmlD .= '<td width="50%"><span style="font-size:6.5pt;font-weight:bold;color:' . $FAINT . ';">ESTATURA</span><br/>' . $esc($f['height_cm'] ? $f['height_cm'] . ' cm' : '—') . '</td>';
$htmlD .= '</tr></table>';
$htmlD .= '<p style="font-size:9pt;margin:2mm 0;">c. Criança no percentil de peso inferior a 10: '
    . $box($f['percentile_below_10'] === 'nao', 'Não') . '&nbsp;&nbsp;' . $box($f['percentile_below_10'] === 'sim', 'Sim') . '</p>';
$htmlD .= '<p style="font-size:9pt;margin:2mm 0;">d. Desaceleração da curva de peso: '
    . $box($f['weight_deceleration'] === 'nao', 'Não') . '&nbsp;&nbsp;' . $box($f['weight_deceleration'] === 'sim', 'Sim')
    . '. Há quanto tempo? ' . $esc($f['weight_deceleration_time'] ?: '—') . '</p>';

$htmlD .= '<p style="font-size:9pt;margin:3mm 0 1mm 0;">Caso SIM anote os últimos pesos e datas:</p>';
$histRows = $nutritionHistory ?: [[], [], []];
$htmlD .= '<table border="1" cellpadding="2" style="width:55%;font-size:8pt;border-color:#94A3B8;">';
foreach ($histRows as $i => $h) {
    $htmlD .= '<tr><td width="50%">' . ($i + 1) . '. Data: ' . $esc($h['data'] ?? '') . '</td>'
        . '<td width="50%">Peso: ' . $esc(!empty($h['peso']) ? $h['peso'] . ' kg' : '') . '</td></tr>';
}
$htmlD .= '</table>';

// ── Seção F) Conduta — coluna esquerda, ao lado do QR (reduzido) ──────────
$htmlF  = '<p style="font-size:9pt;margin:2mm 0;">a. ' . $box($f['conduta_option'] === 'nao_preenche', 'No momento, não preenche os critérios') . '</p>';
$htmlF .= '<p style="font-size:9pt;margin:2mm 0;">b. ' . $box($f['conduta_option'] === 'liberado', 'Liberado o fornecimento de fórmula especial de')
    . ' ' . $esc($f['formula_latas'] ?: '____') . ' latas, por ' . $esc($f['formula_meses'] ?: '____') . ' (meses):</p>';
foreach (['Proteína isolada de soja', 'Fórmula extensamente hidrolisada', 'Fórmula de aminoácidos'] as $opt) {
    $htmlF .= '<p style="font-size:9pt;margin:1mm 0 1mm 6mm;">' . $box(in_array($opt, $formulaTypes ?: [], true), $opt) . '</p>';
}
$htmlF .= '<p style="font-size:9pt;margin:3mm 0 0 0;">c. Data do retorno: ' . $esc($formatDate($f['data_retorno']) ?: '—')

    . '&nbsp;&nbsp;&nbsp; Previsão do teste de provocação: ' . $esc($formatDate($f['previsao_provocacao']) ?: '—') . '</p>';
// ── Rodapé — identificação do médico (esquerda) + Avaliador (direita),
// lado a lado. NÃO é o rodapé legal de firma — esse é adicionado depois,
// automaticamente, por signAndDownloadPdf, com a identidade real do
// certificado; este aqui são os campos do formulário original (CNS/CPF).
$htmlRodape  = '<table border="1" cellpadding="3" style="width:100%;font-size:8pt;border-color:#94A3B8;">';
$htmlRodape .= '<tr><td>DATA: ' . $esc($formatDate($f['footer_date']) ?: '—') . '</td></tr>';
$htmlRodape .= '<tr><td>CNS / MÉDICO RESPONSÁVEL:<br/>' . $esc($f['doctor_cns'] ?: DOCTOR_CNS) . '</td></tr>';
$htmlRodape .= '<tr><td>CPF / MÉDICO RESPONSÁVEL:<br/>' . $esc($f['doctor_cpf'] ?: DOCTOR_CPF) . '</td></tr>';
$htmlRodape .= '<tr><td style="text-align:center;">Carimbo e assinatura</td></tr>';
$htmlRodape .= '</table>';

$htmlAvaliador = '<p style="text-align:center;font-size:9pt;margin:8mm 0 0 0;">' . $esc($f['avaliador'] ?: ' ') . '</p>'
    . '<p style="text-align:center;font-size:8pt;color:' . $MUTED . ';margin:1mm 0 0 0;border-top:0.3mm solid ' . $LINE . ';padding-top:1mm;">Avaliador — Assinatura e carimbo</p>';

// ------------------------------------------------------------------
$pdf = new TCPDF('P', 'mm', 'A4', true, 'UTF-8', false);
$pdf->SetCreator('NeuroExamenes');
$pdf->SetAuthor(DOCTOR_NAME);
$pdf->SetTitle('Fórmulas Infantis Especiais - ' . $f['patient_name']);
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);
$leftMargin  = 14;
$rightMargin = 14;
$pdf->SetMargins($leftMargin, 12, $rightMargin);
$pdf->SetAutoPageBreak(true, 14);
$pdf->AddPage();
$pdf->SetFont('freesans', '', 9);

$pageWidth = $pdf->getPageWidth();
$contentW  = $pageWidth - $leftMargin - $rightMargin;

// ── Página 1 (sem QR — o QR desta ficha vai na página 2, ao lado de F) ───
$pdf->writeHTML($htmlMasthead, true, false, true, false, '');
$pdf->SetY($pdf->GetY() + 4);

$pdf->writeHTML($htmlPatientName, true, false, true, false, '');

$barY = $pdf->GetY() + 1;
$pdf->SetFont('freesans', 'B', 15);
$nameBarW = min($pdf->GetStringWidth(strtoupper($f['patient_name'])), $contentW);
$pdf->SetFont('freesans', '', 9);
$pdf->SetFillColor(17, 17, 17);
$pdf->Rect($leftMargin, $barY, $nameBarW, 0.9, 'F');
$pdf->SetY($barY + 3.5);

$pdf->writeHTML($htmlSectionA, true, false, true, false, '');
$pdf->SetY($pdf->GetY() + 6);

$pdf->writeHTML('<p style="font-size:10pt;font-weight:bold;border-bottom:0.4mm solid black;padding-bottom:1mm;margin:0 0 2mm 0;">B) Sinais e sintomas clínicos presentes:</p>', true, false, true, false, '');
$pdf->writeHTML($htmlB, true, false, true, false, '');
$pdf->writeHTML($htmlSymptomsNotes, true, false, true, false, '');

// ── Página 2 ────────────────────────────────────────────────────────────
$pdf->AddPage();
$pdf->SetFont('freesans', '', 9);

$pdf->writeHTML('<p style="font-size:10pt;font-weight:bold;border-bottom:0.4mm solid black;padding-bottom:1mm;margin:0 0 2mm 0;">C) Exames subsidiários realizados (mais recentes):</p>', true, false, true, false, '');
$pdf->writeHTML($htmlC, true, false, true, false, '');

$pdf->writeHTML('<p style="font-size:10pt;font-weight:bold;border-bottom:0.4mm solid black;padding-bottom:1mm;margin:5mm 0 2mm 0;">D) Avaliação da condição nutricional:</p>', true, false, true, false, '');
$pdf->writeHTML($htmlD, true, false, true, false, '');

// F) Conduta (coluna esquerda) + QR reduzido (coluna direita), lado a lado,
// e logo abaixo o rodapé (identificação do médico + Avaliador) — tudo isso
// tratado como UM bloco atômico: se não coubesse inteiro no espaço restante
// da página, o quebra de página automático do TCPDF cortava a tabela do
// rodapé ao meio (mesmo bug já visto no cartão do QR de recetas/signed-pdf.php).
// Em vez de confiar numa estimativa de altura por elemento, verifica-se
// aqui, ANTES de desenhar qualquer coisa do bloco, se sobra espaço
// suficiente (95mm é uma estimativa generosa do bloco inteiro) — senão,
// força uma página nova primeiro.
$footerBlockEstimate = 95;
$bottomSafe = $pdf->getPageHeight() - 14;
if ($pdf->GetY() + $footerBlockEstimate > $bottomSafe) {
    $pdf->AddPage();
    $pdf->SetFont('freesans', '', 9);
}

$pdf->writeHTML('<p style="font-size:10pt;font-weight:bold;border-bottom:0.4mm solid black;padding-bottom:1mm;margin:5mm 0 2mm 0;">F) Conduta: <span style="font-weight:normal;font-size:8pt;">(uso restrito a SES-SP)</span></p>', true, false, true, false, '');

$qrColW   = 30;
$gapCol   = 6;
$fColW    = $contentW - $qrColW - $gapCol;
$qrColX   = $leftMargin + $fColW + $gapCol;
$yF       = $pdf->GetY();

$pdf->SetRightMargin($pageWidth - $leftMargin - $fColW);
$pdf->writeHTML($htmlF, true, false, true, false, '');
$yAfterF = $pdf->GetY();
$pdf->SetRightMargin($rightMargin);

$yAfterQr = drawCompactQrBox($pdf, $qrColX, $yF, $qrColW, $f['qr_content'], $f['token']);

// Rodapé (identificação do médico) + Avaliador, lado a lado — mesmo bloco
// de baixo da página, um do lado do outro. Âncora FIXA perto do fim real da
// página (mesmo padrão de api/atestados/signed-pdf.php) — sem isso este
// bloco (e a linha legal que signAndDownloadPdf() desenha logo depois)
// continuava direto após "F) Conduta", então uma Conduta curta empurrava a
// assinatura pro meio da página. Só cede se "F) Conduta" for tão longa que
// já invada essa zona — nunca sobe por conteúdo curto.
// 95mm (rodapé de 4 filas + Avaliador + la línea legal que agrega
// signAndDownloadPdf() después necesitan ~55-60mm reales, más ~30mm de
// margen real hasta el borde físico de la hoja — igual que Atestados;
// muchas impresoras recortan en silencio lo que cae dentro de su margen no
// imprimible, aunque se vea perfecto en un visor de PDF) y SetAutoPageBreak
// en false: con el auto-salto activo (SetAutoPageBreak(true, 14) seguía
// vigente de más arriba) y una zona más chica, la línea legal terminaba
// cortada a la mitad — la segunda oración quedaba sola en una página extra
// casi en blanco (bug real, confirmado renderizando un PDF de prueba). Nada
// más se dibuja después de esto en este script.
$rodapeZoneH  = 95;
$fixedRodapeY = $pdf->getPageHeight() - $rodapeZoneH;
$pdf->SetAutoPageBreak(false);
$pdf->SetY(max(max($yAfterF, $yAfterQr) + 6, $fixedRodapeY));
$footColW = ($contentW - $gapCol) / 2;
$avalColX = $leftMargin + $footColW + $gapCol;
$yFoot    = $pdf->GetY();

$pdf->SetRightMargin($pageWidth - $leftMargin - $footColW);
$pdf->writeHTML($htmlRodape, true, false, true, false, '');
$yAfterRodape = $pdf->GetY();
$pdf->SetRightMargin($rightMargin);

$pdf->SetLeftMargin($avalColX);
$pdf->SetY($yFoot + 8);
$pdf->writeHTML($htmlAvaliador, true, false, true, false, '');
$pdf->SetLeftMargin($leftMargin);

$pdf->SetY(max($yAfterRodape, $pdf->GetY()));

signAndDownloadPdf($pdf, 'formula_leite_' . $docId . '_assinado.pdf', DOCTOR_NAME, 'formula_leite', $docId);

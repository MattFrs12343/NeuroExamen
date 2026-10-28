<?php
/**
 * /api/orders/{id}/signed-pdf
 *
 * GET  → devolve só {token, qrContent} (JSON, sem PDF) — o navegador usa
 *        isso pra desenhar o QR na própria plantilla de impressão real
 *        (PrintTemplate.tsx, uma página por exame) antes de capturá-la.
 * POST → recebe (corpo bruto) o PDF que o navegador já capturou dessa
 *        mesma plantilla (html2canvas + jsPDF — ver src/lib/pdfCapture.ts,
 *        já filtrado pelos exames selecionados em PrintSelectionModal.tsx)
 *        e devolve ele assinado digitalmente — com a firma real em CADA
 *        página (não só na última), porque cada página é um exame
 *        independente. Não precisa mais saber nomes de exame, categorias
 *        nem nada do conteúdo: só importa as páginas via FPDI e assina.
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/signing.php';
require_once __DIR__ . '/../../lib/doctor.php';
require_once __DIR__ . '/../../lib/specializedExamDocs.php';
require_once __DIR__ . '/../../lib/orderWatermarkPdf.php';

setCorsHeaders();

header_register_callback(function () {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
});

requireAuth();

$path    = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts   = explode('/', $path);
$idx     = array_search('orders', $parts);
$orderId = ($idx !== false && isset($parts[$idx + 1])) ? $parts[$idx + 1] : null;

if (!$orderId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'ID de pedido no especificado.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('
    SELECT o.*, p.name AS patient_name
    FROM orders o
    JOIN patients p ON p.id = o.patient_id
    WHERE o.id = ?
');
$stmt->execute([$orderId]);
$o = $stmt->fetch();

if (!$o) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['error' => 'Pedido não encontrado.']);
    exit;
}

resolveVerificationUrl($pdo, 'orders', 'orders', $orderId, $o);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respondVerificationInfo($o);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $contentHeightsMm = isset($_GET['contentHeights']) && $_GET['contentHeights'] !== ''
        ? array_map('floatval', explode(',', $_GET['contentHeights']))
        : null;

    $examIds = isset($_GET['examIds']) && $_GET['examIds'] !== ''
        ? explode(',', $_GET['examIds'])
        : null;
    $specializedIds = specializedExamDocIds();
    $hasSpecialized = $examIds && array_intersect($examIds, $specializedIds);

    // Qué documentos salen cuando el pedido tiene justificaciones médicas:
    //   'justification' → solo el documento especial (generado con TCPDF).
    //   'order'         → solo las hojas de pedido capturadas por el navegador.
    //   'both'          → ambas, intercaladas (comportamiento histórico).
    // El navegador lo manda explícito; si no viene, se usa lo guardado en el
    // pedido. Cualquier valor desconocido cae en 'both'.
    $printMode = $_GET['printMode'] ?? $o['print_mode'] ?? 'both';
    if (!in_array($printMode, ['justification', 'order', 'both'], true)) {
        $printMode = 'both';
    }

    // Sin lista de exámenes (llamador viejo), sin ningún especializado en
    // este pedido, o en modo "solo pedido": camino de siempre — todas las
    // páginas capturadas se importan tal cual (ver signUploadedPdf()).
    if (!$examIds || !$hasSpecialized || $printMode === 'order') {
        signUploadedPdf('pedido_' . $orderId . '_assinado.pdf', DOCTOR_NAME, true, $contentHeightsMm, true, 35.0, null, 7.0, 'right', 'orders', $orderId);
        exit;
    }

    // Hay Dinamômetro/Estesiômetro/Equilíbrio en este pedido: esos exámenes
    // NO vienen en el PDF capturado (PrintTemplate.tsx los omite durante la
    // captura — ver captureTarget==='order' en ese componente) y se generan
    // acá de cero con TCPDF, intercalados en el orden original con las
    // páginas capturadas de los demás exámenes (mismo formato que Laudos).
    // En 'justification' no se importa ninguna página capturada.
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

    // Marca de agua del logo de la clínica elegida en ESTE pedido — solo
    // para las hojas de los documentos especializados (texto vectorial): en
    // las páginas importadas de exámenes genéricos, el raster capturado es
    // opaco y la tapa por completo, así que no hace falta distinguir.
    $wmBin = null;
    $clinicLogo = getOrderClinicLogoDataUri($pdo, $o['clinic_name'] ?? null);
    if ($clinicLogo) {
        $wmBin = base64_decode(substr($clinicLogo, strpos($clinicLogo, ',') + 1));
    }

    $pdf = new OrderWatermarkFpdi('P', 'mm', 'A4', true, 'UTF-8', false);
    $pdf->wmBin = $wmBin;
    $pdf->SetCreator('NeuroExamenes');
    $pdf->SetAuthor(DOCTOR_NAME);
    $pdf->setPrintHeader(true);
    $pdf->setPrintFooter(false);

    try {
        $pageCount = $pdf->setSourceFile($tmpPath);
    } catch (\Throwable $e) {
        header('Content-Type: application/json');
        http_response_code(400);
        echo json_encode(['error' => 'Arquivo PDF inválido: ' . $e->getMessage()]);
        exit;
    }

    $sig = resolveSigner(DOCTOR_NAME);
    $capturedPageIdx = 0; // próxima página SIN USAR del PDF capturado (una por examen, SIEMPRE, incluidos los especializados)

    foreach ($examIds as $examId) {
        // La hoja de pedido genérica sale en 'both' (el médico pidió
        // explícitamente que no se reemplace, sino que el documento
        // especializado se agregue A CONTINUACIÓN de ella). En
        // 'justification' se omite a propósito.
        if ($printMode !== 'justification') {
            $capturedPageIdx++;
            if ($capturedPageIdx <= $pageCount) {
                $templateId = $pdf->importPage($capturedPageIdx);
                $size = $pdf->getTemplateSize($templateId);
                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);

                $contentH = $contentHeightsMm[$capturedPageIdx - 1] ?? null;
                $footerFromBottomMm = 35.0;
                $fixedFooterY = $size['height'] - $footerFromBottomMm;
                $footerY = ($contentH !== null && $contentH + 2 > $fixedFooterY)
                    ? min($contentH + 2, $size['height'] - 25)
                    : $fixedFooterY;

                $pdf->SetAutoPageBreak(false);
                $pdf->SetXY(0, $footerY);
                $pdf->SetLeftMargin(18);
                $pdf->SetRightMargin(18);
                drawSignatureFooter($pdf, $sig['name'], $sig['document'], $sig['documentLabel'], 7.0);
            }
        }

        if (in_array($examId, $specializedIds, true)) {
            renderSpecializedExamDocument(
                $pdf,
                $examId,
                (string) $o['patient_name'],
                (string) $o['date'],
                $sig,
                $o['qr_content'] ?? null,
                $o['token'] ?? null,
                $o['access_code'] ?? null
            );
        }
    }

    signPdfOutput($pdf, 'pedido_' . $orderId . '_assinado.pdf', $sig, 'orders', $orderId);
    exit;
}

header('Content-Type: application/json');
http_response_code(405);
echo json_encode(['error' => 'Método no permitido.']);

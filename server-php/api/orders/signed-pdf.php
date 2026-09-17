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
    signUploadedPdf('pedido_' . $orderId . '_assinado.pdf', DOCTOR_NAME, true, $contentHeightsMm, true, 35.0, null, 7.0, 'right', 'orders', $orderId);
    exit;
}

header('Content-Type: application/json');
http_response_code(405);
echo json_encode(['error' => 'Método no permitido.']);

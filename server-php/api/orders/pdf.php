<?php
/**
 * GET /api/orders/{id}/pdf
 * Genera y devuelve el PDF del pedido.
 * Usa FPDF (lib/fpdf/fpdf.php) — sin Composer.
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/fpdf/fpdf.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Content-Type: application/json');
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

requireAuth();

// Extract order id from URL: /api/orders/{id}/pdf
$path     = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts    = explode('/', $path);
// Find 'orders' segment and get the next segment as id
$idx      = array_search('orders', $parts);
$orderId  = ($idx !== false && isset($parts[$idx + 1])) ? $parts[$idx + 1] : null;

if (!$orderId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'ID de pedido no especificado.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('
    SELECT o.*, p.name AS patient_name, p.identity_card AS patient_identity_card,
           u.name AS user_name, u.specialty AS user_specialty,
           u.crm_license AS user_crm, u.rqe_specialty AS user_rqe
    FROM orders o
    JOIN patients p ON p.id = o.patient_id
    JOIN users   u ON u.id = o.user_id
    WHERE o.id = ?
');
$stmt->execute([$orderId]);
$order = $stmt->fetch();

if (!$order) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['error' => 'Pedido médico no encontrado.']);
    exit;
}

// Fetch exams with category
$stmt = $pdo->prepare('
    SELECT e.id, e.name, e.category
    FROM order_exams oe
    JOIN exams e ON e.id = oe.exam_id
    WHERE oe.order_id = ?
');
$stmt->execute([$orderId]);
$exams = $stmt->fetchAll();

$examDescriptions = $order['exam_descriptions'] ? json_decode($order['exam_descriptions'], true) : [];

// Group exams by category
$byCategory = [];
foreach ($exams as $e) {
    $byCategory[$e['category']][] = $e;
}

// ------------------------------------------------------------------
// Build PDF with FPDF
// ------------------------------------------------------------------
$pdf = new FPDF('P', 'mm', 'A4');
$pdf->AddPage();
$pdf->SetMargins(20, 15, 20);
$pdf->SetAutoPageBreak(true, 20);

// Header
$pdf->SetFont('Arial', 'B', 16);
$pdf->Cell(0, 8, 'NEUROEXAMENES', 0, 1, 'L');
$pdf->SetFont('Arial', '', 9);
$pdf->Cell(0, 5, 'Centro de Neurofisiologia y Diagnostico', 0, 1, 'L');
$pdf->Ln(6);

// Title
$pdf->SetFont('Arial', 'BU', 13);
$pdf->Cell(0, 8, 'SOLICITUD DE EXAMENES NEUROLOGICOS', 0, 1, 'C');
$pdf->Ln(6);

// Order info
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, 'Codigo de Orden: ' . $order['id'], 0, 1);
$pdf->Cell(0, 6, 'Fecha: ' . $order['date'], 0, 1);
$pdf->Cell(0, 6, 'Paciente: ' . $order['patient_name'] . ' (DNI: ' . $order['patient_identity_card'] . ')', 0, 1);
$pdf->Cell(0, 6, 'Codigo CID: ' . $order['code_cid'], 0, 1);
if ($order['clinic_name']) {
    $pdf->Cell(0, 6, 'Clinica: ' . $order['clinic_name'], 0, 1);
}
$pdf->Ln(4);

// Exams list
$pdf->SetFont('Arial', 'U', 10);
$pdf->Cell(0, 6, 'Estudios Requeridos:', 0, 1);
$pdf->SetFont('Arial', '', 10);

foreach ($byCategory as $cat => $items) {
    foreach ($items as $item) {
        $pdf->Cell(0, 6, '[x] ' . $item['name'], 0, 1);
    }
    if (!empty($examDescriptions[$cat])) {
        $pdf->SetFont('Arial', 'I', 8);
        $pdf->Cell(0, 5, '    Obs: ' . $examDescriptions[$cat], 0, 1);
        $pdf->SetFont('Arial', '', 10);
    }
}

if ($order['observations']) {
    $pdf->Ln(4);
    $pdf->Cell(0, 6, 'Observaciones: ' . $order['observations'], 0, 1);
}

// Signature block
$pdf->Ln(16);
$pdf->SetFont('Arial', '', 10);
$pdf->Cell(0, 6, '-------------------------------------------', 0, 1, 'C');
$pdf->Cell(0, 6, $order['user_name'], 0, 1, 'C');
$pdf->Cell(0, 6, $order['user_specialty'], 0, 1, 'C');
$pdf->Cell(0, 6, 'Licencia CRM: ' . $order['user_crm'], 0, 1, 'C');

// Output
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="pedido_' . $orderId . '.pdf"');
$pdf->Output('D', 'pedido_' . $orderId . '.pdf');

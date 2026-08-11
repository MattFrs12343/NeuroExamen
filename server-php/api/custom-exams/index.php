<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extract optional :id from URL  /api/custom-exams/{id}
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$examId    = ($lastPart !== 'custom-exams' && $lastPart !== 'index.php') ? $lastPart : null;

// ------------------------------------------------------------------
// GET /api/custom-exams
// ------------------------------------------------------------------
if ($method === 'GET' && !$examId) {
    $stmt = $pdo->query('SELECT id, name FROM custom_exams ORDER BY created_at ASC');
    echo json_encode($stmt->fetchAll());
    exit;
}

// ------------------------------------------------------------------
// POST /api/custom-exams
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim($body['name'] ?? '');

    if (!$name) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre del estudio es requerido.']);
        exit;
    }

    $id = 'custom-' . bin2hex(random_bytes(8));

    $stmt = $pdo->prepare('INSERT INTO custom_exams (id, name, created_by) VALUES (?, ?, ?)');
    $stmt->execute([$id, $name, $userId]);

    http_response_code(201);
    echo json_encode(['id' => $id, 'name' => $name]);
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/custom-exams/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $examId) {
    $stmt = $pdo->prepare('DELETE FROM custom_exams WHERE id = ?');
    $stmt->execute([$examId]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

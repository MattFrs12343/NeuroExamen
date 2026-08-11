<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extract optional :id from URL  /api/medications/{id}
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$medId     = ($lastPart !== 'medications' && $lastPart !== 'index.php') ? $lastPart : null;

// ------------------------------------------------------------------
// GET /api/medications
// ------------------------------------------------------------------
if ($method === 'GET' && !$medId) {
    $stmt = $pdo->query('SELECT id, name FROM medication_catalog ORDER BY name ASC');
    echo json_encode($stmt->fetchAll());
    exit;
}

// ------------------------------------------------------------------
// POST /api/medications
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim($body['name'] ?? '');

    if (!$name) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre del medicamento es requerido.']);
        exit;
    }

    $id = 'med-' . bin2hex(random_bytes(8));

    $stmt = $pdo->prepare('INSERT INTO medication_catalog (id, name, created_by) VALUES (?, ?, ?)');
    $stmt->execute([$id, $name, $userId]);

    http_response_code(201);
    echo json_encode(['id' => $id, 'name' => $name]);
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/medications/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $medId) {
    $stmt = $pdo->prepare('DELETE FROM medication_catalog WHERE id = ?');
    $stmt->execute([$medId]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

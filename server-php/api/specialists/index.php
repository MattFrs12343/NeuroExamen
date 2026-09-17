<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

/** Convierte a Title Case: "cirugia cardiaca" → "Cirugia Cardiaca", "NEUROLOGIA" → "Neurologia". */
function toTitleCase(string $s): string {
    $s = trim($s);
    $s = preg_replace('/\s+/', ' ', $s); // colapsa espacios múltiples
    $words = explode(' ', $s);
    $out = [];
    foreach ($words as $w) {
        if ($w === '') continue;
        $out[] = mb_strtoupper(mb_substr($w, 0, 1, 'UTF-8'), 'UTF-8') .
                 mb_strtolower(mb_substr($w, 1, null, 'UTF-8'), 'UTF-8');
    }
    return implode(' ', $out);
}

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extract optional :id from URL  /api/specialists/{id}
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$specId    = ($lastPart !== 'specialists' && $lastPart !== 'index.php') ? $lastPart : null;

// ------------------------------------------------------------------
// GET /api/specialists?profile=neuromobius|neuroisbe
// ------------------------------------------------------------------
if ($method === 'GET' && !$specId) {
    $profile = $_GET['profile'] ?? null;
    if ($profile) {
        $stmt = $pdo->prepare('SELECT id, name, clinic_profile AS clinicProfile FROM specialist_catalog WHERE clinic_profile IS NULL OR clinic_profile = ? ORDER BY name ASC');
        $stmt->execute([$profile]);
    } else {
        $stmt = $pdo->query('SELECT id, name, clinic_profile AS clinicProfile FROM specialist_catalog ORDER BY name ASC');
    }
    echo json_encode($stmt->fetchAll());
    exit;
}

// ------------------------------------------------------------------
// POST /api/specialists
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $name    = toTitleCase(trim($body['name'] ?? ''));
    $profile = trim($body['profile'] ?? '') ?: null;

    if (!$name) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre del especialista es requerido.']);
        exit;
    }

    $id = 'spec-' . bin2hex(random_bytes(8));

    $stmt = $pdo->prepare('INSERT INTO specialist_catalog (id, name, clinic_profile, created_by) VALUES (?, ?, ?, ?)');
    $stmt->execute([$id, $name, $profile, $userId]);

    http_response_code(201);
    echo json_encode(['id' => $id, 'name' => $name, 'clinicProfile' => $profile]);
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/specialists/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $specId) {
    try {
        $stmt = $pdo->prepare('DELETE FROM specialist_catalog WHERE id = ?');
        $stmt->execute([$specId]);
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            http_response_code(409);
            echo json_encode(['error' => 'No se puede eliminar: este especialista está en uso en uno o más encaminhamentos.']);
        } else {
            throw $e;
        }
    }
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

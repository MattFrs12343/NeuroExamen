<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// ------------------------------------------------------------------
// POST /api/clinics  — agregar una nueva clínica al catálogo
// ------------------------------------------------------------------
if ($method === 'POST') {
    requireAuth();

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim($body['name'] ?? '');

    if ($name === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Debe indicar el nombre de la clínica.']);
        exit;
    }

    $pdo  = getDB();
    $stmt = $pdo->prepare('SELECT id, name, active FROM clinics WHERE LOWER(name) = LOWER(?)');
    $stmt->execute([$name]);
    $existing = $stmt->fetch();

    if ($existing) {
        // Reactivar si estaba desactivada, conservando el nombre almacenado
        if ((int)$existing['active'] === 0) {
            $pdo->prepare('UPDATE clinics SET active = 1 WHERE id = ?')->execute([$existing['id']]);
        }
        $clinic = ['id' => (int)$existing['id'], 'name' => $existing['name'], 'exists' => true];
    } else {
        $pdo->prepare('INSERT INTO clinics (name) VALUES (?)')->execute([$name]);
        $clinic = ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'exists' => false];
    }

    http_response_code(201);
    echo json_encode($clinic);
    exit;
}

// ------------------------------------------------------------------
// GET /api/clinics  — listado del catálogo
// ------------------------------------------------------------------
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

requireAuth();

$pdo  = getDB();
$stmt = $pdo->query('SELECT id, name FROM clinics WHERE active = 1 ORDER BY name ASC');
echo json_encode($stmt->fetchAll());
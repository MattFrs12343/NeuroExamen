<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/clinicKey.php';

setCorsHeaders();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// ------------------------------------------------------------------
// POST /api/clinics  — agregar una nueva clínica al catálogo
// (se guarda en la tabla única clinic_profiles; la identificación por
// name_key evita duplicados por mayúsculas/minúsculas/acentos)
// ------------------------------------------------------------------
if ($method === 'POST') {
    requireAuth();

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim($body['name'] ?? '');
    $name = function_exists('mb_strtoupper') ? mb_strtoupper($name, 'UTF-8') : strtoupper($name);

    if ($name === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Debe indicar el nombre de la clínica.']);
        exit;
    }

    $pdo     = getDB();
    $nameKey = clinic_key($name);
    $stmt    = $pdo->prepare('SELECT id, name, active FROM clinic_profiles WHERE name_key = ?');
    $stmt->execute([$nameKey]);
    $existing = $stmt->fetch();

    if ($existing) {
        // Reactivar si estaba desactivada, conservando el nombre almacenado
        if ((int)$existing['active'] === 0) {
            $pdo->prepare('UPDATE clinic_profiles SET active = 1 WHERE id = ?')->execute([$existing['id']]);
        }
        $clinic = ['id' => (int)$existing['id'], 'name' => $existing['name'], 'exists' => true];
    } else {
        $pdo->prepare('INSERT INTO clinic_profiles (name, name_key) VALUES (?, ?)')->execute([$name, $nameKey]);
        $clinic = ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'exists' => false];
    }

    http_response_code(201);
    echo json_encode($clinic);
    exit;
}

// ------------------------------------------------------------------
// GET /api/clinics  — listado del catálogo completo
// ------------------------------------------------------------------
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

requireAuth();

$pdo  = getDB();
$stmt = $pdo->query('SELECT id, name FROM clinic_profiles WHERE active = 1 ORDER BY name ASC');
echo json_encode($stmt->fetchAll());
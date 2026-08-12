<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extract optional :id from URL  /api/patients/{id}
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$patientId = ($lastPart !== 'patients' && $lastPart !== 'index.php') ? $lastPart : null;

// ------------------------------------------------------------------
// GET /api/patients
// ------------------------------------------------------------------
if ($method === 'GET' && !$patientId) {
    $stmt = $pdo->query('SELECT id, name, identity_card AS identityCard, age, origin, address FROM patients ORDER BY name ASC');
    echo json_encode($stmt->fetchAll());
    exit;
}

// ------------------------------------------------------------------
// POST /api/patients
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body         = json_decode(file_get_contents('php://input'), true) ?? [];
    $name         = trim($body['name']         ?? '');
    $identityCard = trim($body['identityCard'] ?? '');
    $age          = isset($body['age']) && $body['age'] !== '' ? (int)$body['age'] : null;
    $origin       = in_array($body['origin'] ?? null, ['neuromobius', 'neuroisbe'], true)
                        ? $body['origin']
                        : null;
    $address      = trim($body['address'] ?? '');
    $address      = $address !== '' ? $address : null;

    if (!$name) {
        http_response_code(400);
        echo json_encode(['error' => 'El nombre es requerido.']);
        exit;
    }

    // El documento es opcional; vacío / 'N/A' / placeholders 'NA-*' => NULL
    $identityCard = in_array($identityCard, ['', 'N/A'], true) || str_starts_with($identityCard, 'NA-')
        ? null : $identityCard;

    if ($identityCard !== null) {
        $stmt = $pdo->prepare('SELECT id FROM patients WHERE identity_card = ?');
        $stmt->execute([$identityCard]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Ya existe un paciente con ese documento.']);
            exit;
        }
    }

    $id = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );

    $stmt = $pdo->prepare('INSERT INTO patients (id, name, identity_card, age, origin, address) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$id, $name, $identityCard, $age, $origin, $address]);

    http_response_code(201);
    echo json_encode(['id' => $id, 'name' => $name, 'identityCard' => $identityCard, 'age' => $age, 'origin' => $origin, 'address' => $address]);
    exit;
}

// ------------------------------------------------------------------
// PUT /api/patients/:id
// ------------------------------------------------------------------
if ($method === 'PUT' && $patientId) {
    $body         = json_decode(file_get_contents('php://input'), true) ?? [];
    $name         = trim($body['name']         ?? '');
    $identityCard = trim($body['identityCard'] ?? '');
    $age          = isset($body['age']) && $body['age'] !== '' ? (int)$body['age'] : null;
    $address      = trim($body['address'] ?? '');
    $address      = $address !== '' ? $address : null;

    $identityCard = in_array($identityCard, ['', 'N/A'], true) || str_starts_with($identityCard, 'NA-')
        ? null : $identityCard;

    $stmt = $pdo->prepare('UPDATE patients SET name = ?, identity_card = ?, age = ?, address = ? WHERE id = ?');
    $stmt->execute([$name, $identityCard, $age, $address, $patientId]);

    echo json_encode(['id' => $patientId, 'name' => $name, 'identityCard' => $identityCard, 'age' => $age, 'address' => $address]);
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/patients/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $patientId) {
    $stmt = $pdo->prepare('DELETE FROM patients WHERE id = ?');
    $stmt->execute([$patientId]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

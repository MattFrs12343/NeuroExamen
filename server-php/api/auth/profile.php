<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

$userId = requireAuth();
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$name   = trim($body['name']  ?? '');
$email  = trim($body['email'] ?? '');

if (!$name || !$email) {
    http_response_code(400);
    echo json_encode(['error' => 'Nombre y email son requeridos.']);
    exit;
}

$pdo = getDB();

// Check email conflict with another user
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
$stmt->execute([$email, $userId]);
if ($stmt->fetch()) {
    http_response_code(400);
    echo json_encode(['error' => 'El correo ya está en uso por otro usuario.']);
    exit;
}

$stmt = $pdo->prepare('UPDATE users SET name = ?, email = ? WHERE id = ?');
$stmt->execute([$name, $email, $userId]);

$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

echo json_encode([
    'id'               => $user['id'],
    'name'             => $user['name'],
    'email'            => $user['email'],
    'specialty'        => $user['specialty'],
    'crmLicense'       => $user['crm_license'],
    'rqeSpecialty'     => $user['rqe_specialty'],
    'registrationDate' => $user['registration_date'],
]);

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

$currentPassword = $body['currentPassword'] ?? '';
$newPassword     = $body['newPassword']     ?? '';

if (!$currentPassword || !$newPassword) {
    http_response_code(400);
    echo json_encode(['error' => 'Contraseña actual y nueva son requeridas.']);
    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'La nueva contraseña debe tener al menos 8 caracteres.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Usuario no encontrado.']);
    exit;
}

if (!password_verify($currentPassword, $user['password_hash'])) {
    http_response_code(400);
    echo json_encode(['error' => 'La contraseña actual es incorrecta.']);
    exit;
}

$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$stmt    = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
$stmt->execute([$newHash, $userId]);

echo json_encode(['success' => true, 'message' => 'Contraseña actualizada correctamente.']);

<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

$userId = requireAuth();
$pdo    = getDB();

$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Usuario no encontrado.']);
    exit;
}

echo json_encode([
    'id'               => $user['id'],
    'name'             => $user['name'],
    'email'            => $user['email'],
    'specialty'        => $user['specialty'],
    'crmLicense'       => $user['crm_license'],
    'rqeSpecialty'     => $user['rqe_specialty'],
    'registrationDate' => $user['registration_date'],
]);

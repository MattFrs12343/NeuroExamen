<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$email    = trim($body['email']    ?? '');
$password = $body['password']      ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Email y contraseña son requeridos.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Credenciales inválidas.']);
    exit;
}

$secret  = $_ENV['JWT_SECRET'] ?? 'neuro-secret-key-2026';
$payload = ['userId' => $user['id'], 'exp' => time() + 8 * 3600];
$token   = generateJWT($payload, $secret);

echo json_encode([
    'token' => $token,
    'user'  => [
        'id'               => $user['id'],
        'name'             => $user['name'],
        'email'            => $user['email'],
        'specialty'        => $user['specialty'],
        'crmLicense'       => $user['crm_license'],
        'rqeSpecialty'     => $user['rqe_specialty'],
        'registrationDate' => $user['registration_date'],
    ],
]);

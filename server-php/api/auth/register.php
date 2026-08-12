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

// Registro abierto deshabilitado por defecto en producción.
// Activar SOLO si realmente se necesitan cuentas múltiples:
//   ALLOW_REGISTRATION=true en server-php/.env
if (($_ENV['ALLOW_REGISTRATION'] ?? 'false') !== 'true') {
    http_response_code(403);
    echo json_encode(['error' => 'El registro está deshabilitado en este servidor.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?? [];

$name        = trim($body['name']        ?? '');
$email       = trim($body['email']       ?? '');
$password    = $body['password']         ?? '';
$specialty   = trim($body['specialty']   ?? '');
$crmLicense  = trim($body['crmLicense']  ?? '123456');
$rqeSpecialty = trim($body['rqeSpecialty'] ?? '98765');

if (!$name || !$email || !$password || !$specialty) {
    http_response_code(400);
    echo json_encode(['error' => 'Campos requeridos faltantes.']);
    exit;
}

$pdo = getDB();

$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    http_response_code(400);
    echo json_encode(['error' => 'El correo electrónico ya está registrado.']);
    exit;
}

$id           = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    mt_rand(0, 0xffff), mt_rand(0, 0xffff),
    mt_rand(0, 0xffff),
    mt_rand(0, 0x0fff) | 0x4000,
    mt_rand(0, 0x3fff) | 0x8000,
    mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
);
$passwordHash = password_hash($password, PASSWORD_BCRYPT);
$now          = date('Y-m-d H:i:s');

$stmt = $pdo->prepare(
    'INSERT INTO users (id, name, email, password_hash, specialty, crm_license, rqe_specialty, registration_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([$id, $name, $email, $passwordHash, $specialty, $crmLicense, $rqeSpecialty, $now]);

$secret = $_ENV['JWT_SECRET'] ?? null;
if (!$secret || strlen($secret) < 32) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuración del servidor incorrecta.']);
    exit;
}
$payload = ['userId' => $id, 'exp' => time() + 8 * 3600];
$token   = generateJWT($payload, $secret);

http_response_code(201);
echo json_encode([
    'token' => $token,
    'user'  => [
        'id'               => $id,
        'name'             => $name,
        'email'            => $email,
        'specialty'        => $specialty,
        'crmLicense'       => $crmLicense,
        'rqeSpecialty'     => $rqeSpecialty,
        'registrationDate' => $now,
    ],
]);

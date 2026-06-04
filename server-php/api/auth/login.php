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

// ── Rate limiting: máx 10 intentos por IP en los últimos 15 minutos ──────
$pdo = getDB();
$ip  = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$ip  = trim(explode(',', $ip)[0]); // tomar solo la primera IP si hay proxy

// Crear tabla si no existe (por si se desplegó sin correr el schema actualizado)
$pdo->exec("CREATE TABLE IF NOT EXISTS login_attempts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_time (ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Limpiar intentos viejos (> 15 min)
$pdo->prepare("DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)")
    ->execute();

// Contar intentos recientes de esta IP
$stmt = $pdo->prepare("SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
$stmt->execute([$ip]);
$attempts = (int) $stmt->fetchColumn();

if ($attempts >= 10) {
    http_response_code(429);
    echo json_encode(['error' => 'Demasiados intentos. Espere 15 minutos antes de intentar de nuevo.']);
    exit;
}

// ── Validar cuerpo ────────────────────────────────────────────────────────
$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$email    = trim($body['email']    ?? '');
$password = $body['password']      ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Email y contraseña son requeridos.']);
    exit;
}

// ── Buscar usuario ────────────────────────────────────────────────────────
$stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    // Registrar intento fallido
    $pdo->prepare("INSERT INTO login_attempts (ip) VALUES (?)")->execute([$ip]);
    http_response_code(401);
    echo json_encode(['error' => 'Credenciales inválidas.']);
    exit;
}

// ── Login exitoso — limpiar intentos de esta IP ───────────────────────────
$pdo->prepare("DELETE FROM login_attempts WHERE ip = ?")->execute([$ip]);

// ── Generar JWT ───────────────────────────────────────────────────────────
$secret = $_ENV['JWT_SECRET'] ?? null;
if (!$secret || strlen($secret) < 32) {
    http_response_code(500);
    echo json_encode(['error' => 'Configuración del servidor incorrecta.']);
    exit;
}

$payload = [
    'userId' => $user['id'],
    'iat'    => time(),
    'exp'    => time() + 8 * 3600, // 8 horas
];
$token = generateJWT($payload, $secret);

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

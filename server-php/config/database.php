<?php
/**
 * Conexión a MySQL via PDO
 * Lee las variables desde .env (o las define directamente aquí en producción)
 */

// No exponer errores internos (rutas, credenciales) en respuestas HTTP.
ini_set('display_errors', '0');
error_reporting(E_ALL);

function loadEnv(string $path): void {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        [$key, $value] = array_map('trim', explode('=', $line, 2));
        if (!array_key_exists($key, $_ENV)) {
            $_ENV[$key] = $value;
            putenv("$key=$value");
        }
    }
}

// Cargar .env desde la raíz de server-php
loadEnv(__DIR__ . '/../.env');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // Fail-closed: en producción SIEMPRE deben estar definidas en .env.
    // No hay credenciales por defecto (root/vacío) para evitar que una
    // instalación sin configurar se conecte silenciosamente a la base.
    $host = $_ENV['DB_HOST'] ?? null;
    $name = $_ENV['DB_NAME'] ?? null;
    $user = $_ENV['DB_USER'] ?? null;
    $pass = $_ENV['DB_PASS'] ?? null;

    if (!$host || !$name || !$user) {
        http_response_code(500);
        echo json_encode(['error' => 'Configuración de base de datos incompleta.'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    try {
        $pdo = new PDO(
            "mysql:host=$host;dbname=$name;charset=utf8mb4",
            $user,
            $pass ?? '',
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]
        );
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Error de conexión a la base de datos.']);
        exit;
    }

    return $pdo;
}

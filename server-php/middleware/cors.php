<?php
/**
 * CORS headers — permite que el frontend React llame al backend PHP.
 * En producción, limitar Access-Control-Allow-Origin al dominio real.
 */
function setCorsHeaders(): void {
    // Lee el dominio permitido desde .env — si no está definido, rechaza origen desconocido
    $allowed = $_ENV['CORS_ORIGIN'] ?? null;

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if ($allowed) {
        // Modo producción: solo el dominio configurado
        if ($origin === $allowed) {
            header("Access-Control-Allow-Origin: $origin", true);
        } else {
            header('Access-Control-Allow-Origin: null', true);
        }
    } else {
        // Modo desarrollo local: permitir localhost en cualquier puerto
        if (
            preg_match('#^https?://localhost(:\d+)?$#', $origin) ||
            preg_match('#^https?://127\.0\.0\.1(:\d+)?$#', $origin)
        ) {
            header("Access-Control-Allow-Origin: $origin", true);
        } else {
            header('Access-Control-Allow-Origin: null', true);
        }
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
    header('Access-Control-Allow-Headers: Content-Type, Authorization', true);
    header('Access-Control-Allow-Credentials: true', true);

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

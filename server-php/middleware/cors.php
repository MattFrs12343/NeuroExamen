<?php
/**
 * CORS headers — permite que el frontend React llame al backend PHP.
 * En producción, definir ALLOWED_ORIGINS en .env con el(los) dominio(s)
 * exacto(s) separados por comas (sin espacios).
 *
 *   ALLOWED_ORIGINS=https://pedidos.examenes-neuro.com
 *
 * Nunca se emite "Access-Control-Allow-Origin: null" con Allow-Credentials;
 * para orígenes no permitidos simplemente no se envía cabecera CORS, y el
 * navegador bloquea la respuesta.
 */
function setCorsHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    $allowed = false;

    // 1. Modo producción: allowlist explícita desde .env
    $allowlist = $_ENV['ALLOWED_ORIGINS'] ?? $_ENV['CORS_ORIGIN'] ?? null;
    if ($allowlist !== null && $origin !== '') {
        foreach (array_map('trim', explode(',', $allowlist)) as $allowedOrigin) {
            if ($allowedOrigin !== '' && $origin === $allowedOrigin) {
                $allowed = true;
                break;
            }
        }
    }

    // 2. Sin allowlist configurada (desarrollo local): solo localhost
    if (!$allowed && $allowlist === null) {
        if (
            preg_match('#^https?://localhost(:\d+)?$#', $origin) ||
            preg_match('#^https?://127\.0\.0\.1(:\d+)?$#', $origin)
        ) {
            $allowed = true;
        }
    }

    if ($allowed) {
        header("Access-Control-Allow-Origin: $origin", true);
        header('Vary: Origin', true);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
        header('Access-Control-Allow-Headers: Content-Type, Authorization', true);
        header('Access-Control-Allow-Credentials: true', true);
        header('Access-Control-Max-Age: 86400', true);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code($allowed ? 204 : 403);
        exit;
    }
}

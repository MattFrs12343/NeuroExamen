<?php
/**
 * CORS headers — permite que el frontend React llame al backend PHP.
 * Usa header(..., true) para reemplazar cualquier valor previo y evitar duplicados.
 */
function setCorsHeaders(): void {
    header('Access-Control-Allow-Origin: *', true);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS', true);
    header('Access-Control-Allow-Headers: Content-Type, Authorization', true);

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

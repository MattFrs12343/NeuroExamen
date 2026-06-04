<?php
/**
 * JWT Authentication Middleware
 * Implementación manual de JWT HS256 sin dependencias externas.
 */

function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function generateJWT(array $payload, string $secret): string {
    $header  = base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64UrlEncode(json_encode($payload));
    $sig     = base64UrlEncode(hash_hmac('sha256', "$header.$payload", $secret, true));
    return "$header.$payload.$sig";
}

function verifyJWT(string $token, string $secret): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$header, $payload, $sig] = $parts;
    $expected = base64UrlEncode(hash_hmac('sha256', "$header.$payload", $secret, true));

    if (!hash_equals($expected, $sig)) return null;

    $data = json_decode(base64UrlDecode($payload), true);
    if (!$data) return null;

    if (isset($data['exp']) && $data['exp'] < time()) return null;

    return $data;
}

function getAuthorizationHeader(): string {
    // Método 1: header estándar
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return $_SERVER['HTTP_AUTHORIZATION'];
    }
    // Método 2: XAMPP/Apache pasa el header via RewriteRule como REDIRECT_HTTP_AUTHORIZATION
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    // Método 3: apache_request_headers() como fallback
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (!empty($headers['Authorization'])) {
            return $headers['Authorization'];
        }
        if (!empty($headers['authorization'])) {
            return $headers['authorization'];
        }
    }
    return '';
}

function requireAuth(): string {
    $secret = $_ENV['JWT_SECRET'] ?? 'neuro-secret-key-2026';
    $header = getAuthorizationHeader();

    if (!str_starts_with($header, 'Bearer ')) {
        http_response_code(401);
        echo json_encode(['error' => 'Acceso denegado, token no proporcionado.']);
        exit;
    }

    $token   = substr($header, 7);
    $payload = verifyJWT($token, $secret);

    if (!$payload || empty($payload['userId'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Token inválido o expirado.']);
        exit;
    }

    return $payload['userId'];
}

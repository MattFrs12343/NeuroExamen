<?php
/**
 * Front controller — enruta todas las peticiones /api/*
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/cors.php';

setCorsHeaders();

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// 1. Quitar el prefijo de subcarpeta + /api  →  /neuro-api/api/patients  ==>  /patients
$uri = preg_replace('#^/neuro-api/api#', '', $uri);
if ($uri === '' || $uri === false) $uri = '/';

// 2. Normalizar: quitar trailing slash  →  /patients/  ==>  /patients
$uri = '/' . trim($uri, '/');
if ($uri === '//') $uri = '/';

// ── Auth ─────────────────────────────────────────────────────────────────────
if ($uri === '/auth/register') { require __DIR__ . '/api/auth/register.php'; exit; }
if ($uri === '/auth/login')    { require __DIR__ . '/api/auth/login.php';    exit; }
if ($uri === '/auth/me')       { require __DIR__ . '/api/auth/me.php';       exit; }
if ($uri === '/auth/profile')  { require __DIR__ . '/api/auth/profile.php';  exit; }
if ($uri === '/auth/password') { require __DIR__ . '/api/auth/password.php'; exit; }

// ── Patients ──────────────────────────────────────────────────────────────────
if ($uri === '/patients' || preg_match('#^/patients/[^/]+$#', $uri)) {
    require __DIR__ . '/api/patients/index.php'; exit;
}

// ── Exams ─────────────────────────────────────────────────────────────────────
if ($uri === '/exams') {
    require __DIR__ . '/api/exams/index.php'; exit;
}

// ── Orders PDF  (antes que la ruta genérica de orders) ───────────────────────
if (preg_match('#^/orders/[^/]+/pdf$#', $uri)) {
    require __DIR__ . '/api/orders/pdf.php'; exit;
}

// ── Orders ────────────────────────────────────────────────────────────────────
if ($uri === '/orders' || preg_match('#^/orders/[^/]+$#', $uri)) {
    require __DIR__ . '/api/orders/index.php'; exit;
}

// ── Setup / Utilities (solo GET, requiere ?confirm=RESET) ────────────────────
if ($uri === '/setup/reset') {
    require __DIR__ . '/setup/reset_data.php'; exit;
}

// ── 404 ───────────────────────────────────────────────────────────────────────
header('Content-Type: application/json');
http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada: ' . $uri]);

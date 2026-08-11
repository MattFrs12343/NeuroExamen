<?php
/**
 * Front controller — enruta todas las peticiones /api/*
 */

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/cors.php';

setCorsHeaders();

$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// 1. Quitar el prefijo + /api  →  /neuro-api/api/patients ó /api/patients  ==>  /patients
//    Soporta desarrollo (/neuro-api/api) y producción (/api).
$uri = preg_replace('#^(/neuro-api)?/api#', '', $uri);
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

// ── Clinics ───────────────────────────────────────────────────────────────────
if ($uri === '/clinics') {
    require __DIR__ . '/api/clinics/index.php'; exit;
}

// ── Clínicas de Recetas (perfil completo, separadas de /clinics) ─────────────
if ($uri === '/receta-clinics') {
    require __DIR__ . '/api/receta-clinics/index.php'; exit;
}

// ── Estudios personalizados ──────────────────────────────────────────────────
if ($uri === '/custom-exams' || preg_match('#^/custom-exams/[^/]+$#', $uri)) {
    require __DIR__ . '/api/custom-exams/index.php'; exit;
}

// ── Orders PDF  (antes que la ruta genérica de orders) ───────────────────────
if (preg_match('#^/orders/[^/]+/pdf$#', $uri)) {
    require __DIR__ . '/api/orders/pdf.php'; exit;
}

// ── Orders ────────────────────────────────────────────────────────────────────
if ($uri === '/orders' || preg_match('#^/orders/[^/]+$#', $uri)) {
    require __DIR__ . '/api/orders/index.php'; exit;
}

// ── Recetas ───────────────────────────────────────────────────────────────────
if ($uri === '/recetas' || preg_match('#^/recetas/[^/]+$#', $uri)) {
    require __DIR__ . '/api/recetas/index.php'; exit;
}

// ── Catálogo de medicamentos ─────────────────────────────────────────────────
if ($uri === '/medications' || preg_match('#^/medications/[^/]+$#', $uri)) {
    require __DIR__ . '/api/medications/index.php'; exit;
}

// ── Catálogo de especialistas ─────────────────────────────────────────────────
if ($uri === '/specialists' || preg_match('#^/specialists/[^/]+$#', $uri)) {
    require __DIR__ . '/api/specialists/index.php'; exit;
}

// ── Encaminhamentos ────────────────────────────────────────────────────────────
if ($uri === '/encaminhamentos' || preg_match('#^/encaminhamentos/[^/]+$#', $uri)) {
    require __DIR__ . '/api/encaminhamentos/index.php'; exit;
}

// ── Setup / Utilities (solo GET, requiere ?confirm=RESET) ────────────────────
if ($uri === '/admin/reset') {
    require __DIR__ . '/setup/reset_data.php'; exit;
}

// ── 404 ───────────────────────────────────────────────────────────────────────
header('Content-Type: application/json');
http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada: ' . $uri]);

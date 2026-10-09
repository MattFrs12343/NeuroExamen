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

// ── Perfiles de Laudo por clínica (datos del emisor, base info, narrativa) ────
if ($uri === '/laudo-clinics') {
    require __DIR__ . '/api/laudo-clinics/index.php'; exit;
}

// ── Catálogo de Conclusão Pericial del Laudo (agregar/editar/eliminar) ────────
if ($uri === '/laudo-conclusoes' || preg_match('#^/laudo-conclusoes/[^/]+$#', $uri)) {
    require __DIR__ . '/api/laudo-conclusoes/index.php'; exit;
}

// ── Estudios personalizados ──────────────────────────────────────────────────
if ($uri === '/custom-exams' || preg_match('#^/custom-exams/[^/]+$#', $uri)) {
    require __DIR__ . '/api/custom-exams/index.php'; exit;
}

// ── Orders firmado digitalmente / PDF legacy (antes que la ruta genérica) ────
if (preg_match('#^/orders/[^/]+/signed-pdf$#', $uri)) {
    require __DIR__ . '/api/orders/signed-pdf.php'; exit;
}
if (preg_match('#^/orders/[^/]+/pdf$#', $uri)) {
    require __DIR__ . '/api/orders/pdf.php'; exit;
}

// ── Orders ────────────────────────────────────────────────────────────────────
if ($uri === '/orders' || preg_match('#^/orders/[^/]+$#', $uri)) {
    require __DIR__ . '/api/orders/index.php'; exit;
}

// ── Receta firmada digitalmente (antes que la ruta genérica de recetas) ─────
if (preg_match('#^/recetas/[^/]+/signed-pdf$#', $uri)) {
    require __DIR__ . '/api/recetas/signed-pdf.php'; exit;
}

// ── Recetas ───────────────────────────────────────────────────────────────────
if ($uri === '/recetas' || preg_match('#^/recetas/[^/]+$#', $uri)) {
    require __DIR__ . '/api/recetas/index.php'; exit;
}

// ── Receituário firmado digitalmente (antes que la ruta genérica) ───────────
if (preg_match('#^/receituarios/[^/]+/signed-pdf$#', $uri)) {
    require __DIR__ . '/api/receituarios/signed-pdf.php'; exit;
}

// ── Receituário (sin listado — solo crear al firmar; ver receituarios/README) ─
if ($uri === '/receituarios' || preg_match('#^/receituarios/[^/]+$#', $uri)) {
    require __DIR__ . '/api/receituarios/index.php'; exit;
}

// ── Laudo Pericial firmado digitalmente (antes que la ruta genérica) ───────
if (preg_match('#^/laudos/[^/]+/signed-pdf$#', $uri)) {
    require __DIR__ . '/api/laudos/signed-pdf.php'; exit;
}

// ── Laudos (Laudo Pericial Médico por clínica) ─────────────────────────────
if ($uri === '/laudos' || preg_match('#^/laudos/[^/]+$#', $uri)) {
    require __DIR__ . '/api/laudos/index.php'; exit;
}

// ── Catálogo de medicamentos ─────────────────────────────────────────────────
if ($uri === '/medications' || preg_match('#^/medications/[^/]+$#', $uri)) {
    require __DIR__ . '/api/medications/index.php'; exit;
}

// ── Catálogo de especialistas ─────────────────────────────────────────────────
if ($uri === '/specialists' || preg_match('#^/specialists/[^/]+$#', $uri)) {
    require __DIR__ . '/api/specialists/index.php'; exit;
}

// ── Encaminhamento firmado digitalmente (antes que la ruta genérica) ────────
if (preg_match('#^/encaminhamentos/[^/]+/signed-pdf$#', $uri)) {
    require __DIR__ . '/api/encaminhamentos/signed-pdf.php'; exit;
}

// ── Encaminhamentos ────────────────────────────────────────────────────────────
if ($uri === '/encaminhamentos' || preg_match('#^/encaminhamentos/[^/]+$#', $uri)) {
    require __DIR__ . '/api/encaminhamentos/index.php'; exit;
}

// ── Atestado firmado digitalmente (antes que la ruta genérica de atestados) ──
if (preg_match('#^/atestados/[^/]+/signed-pdf$#', $uri)) {
    require __DIR__ . '/api/atestados/signed-pdf.php'; exit;
}

// ── Atestados ──────────────────────────────────────────────────────────────────
if ($uri === '/atestados' || preg_match('#^/atestados/[^/]+$#', $uri)) {
    require __DIR__ . '/api/atestados/index.php'; exit;
}

// ── Fórmula Infantil firmada digitalmente (antes que la ruta genérica) ──────
if (preg_match('#^/formula-leite/[^/]+/signed-pdf$#', $uri)) {
    require __DIR__ . '/api/formula-leite/signed-pdf.php'; exit;
}

// ── Fórmulas Infantis Especiais (ficha CNES/leite) ────────────────────────────
if ($uri === '/formula-leite' || preg_match('#^/formula-leite/[^/]+$#', $uri)) {
    require __DIR__ . '/api/formula-leite/index.php'; exit;
}

// ── Verificação pública de documentos firmados (sin autenticación) ────────────
// /verificar/{kind}/{token} — kind = atestados|recetas|orders|encaminhamentos|formula-leite
// /verificar/{kind}/{token}/pdf — descarga del PDF firmado (revalida el código de acceso adentro)
if (preg_match('#^/verificar/[^/]+/[^/]+(/pdf)?$#', $uri)) {
    require __DIR__ . '/api/verificar/index.php'; exit;
}

// ── 404 ───────────────────────────────────────────────────────────────────────
header('Content-Type: application/json');
http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada: ' . $uri]);

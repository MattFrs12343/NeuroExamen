<?php
/**
 * GET /api/clinic-logo?name={clinica}
 *
 * Logo de UNA clínica como data URI (para la marca de agua de fondo que
 * dibuja el navegador en PrintSpecializedExamTemplate.tsx — vista previa
 * "Imprimir" sin firmar). Mismo lookup que usa el PDF firmado (ver
 * getOrderClinicLogoDataUri() en lib/orderWatermarkPdf.php): CUALQUIER
 * clínica activa de clinic_profiles, sin el filtro has_laudo_profile que
 * usa Laudos — así las dos vistas (con y sin firma) muestran la misma marca.
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/orderWatermarkPdf.php';

setCorsHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

requireAuth();

$name = trim($_GET['name'] ?? '');
$pdo = getDB();
$logo = $name !== '' ? getOrderClinicLogoDataUri($pdo, $name) : null;

echo json_encode(['logo' => $logo]);

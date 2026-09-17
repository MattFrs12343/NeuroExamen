<?php
/**
 * /api/encaminhamentos/{id}/signed-pdf
 *
 * GET  → devuelve solo {token, qrContent} (JSON, sin PDF) — el navegador lo
 *        usa para dibujar el QR en la propia plantilla real de impresión
 *        (PrintEncaminhamentoTemplate.tsx) antes de capturarla.
 * POST → recibe (cuerpo crudo) el PDF que el navegador ya capturó de esa
 *        misma plantilla (html2canvas + jsPDF — ver src/lib/pdfCapture.ts)
 *        y lo devuelve firmado digitalmente. Ya NO reconstruye el diseño
 *        desde cero con TCPDF/writeHTML() — importa las páginas vía FPDI y
 *        solo agrega encima la firma legal real, igual que Pedidos/Recetas
 *        (ver signUploadedPdf() en lib/signing.php para el porqué de este
 *        cambio de arquitectura: TCPDF no puede replicar CSS real —
 *        gradientes, border-radius, etc. — así que la versión firmada
 *        terminaba viéndose distinta de "Imprimir").
 *
 * Disponible para ambos perfiles (NeuroMóbius y NeuroIsbe). En NeuroMóbius,
 * la plantilla oculta los contactos + QR decorativo del WhatsApp durante la
 * captura de firma (ver isSigning en PrintEncaminhamentoTemplate.tsx), así el
 * pie queda libre para el QR de verificación + el texto legal, exactamente
 * como en NeuroIsbe — la vista/impresión normal del usuario no cambia.
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/signing.php';
require_once __DIR__ . '/../../lib/doctor.php';

setCorsHeaders();

header_register_callback(function () {
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
});

requireAuth();

$path  = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts = explode('/', $path);
$idx   = array_search('encaminhamentos', $parts);
$encId = ($idx !== false && isset($parts[$idx + 1])) ? $parts[$idx + 1] : null;

if (!$encId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'ID de encaminhamento no especificado.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('
    SELECT e.*, p.name AS patient_name
    FROM encaminhamentos e
    JOIN patients p ON p.id = e.patient_id
    WHERE e.id = ?
');
$stmt->execute([$encId]);
$e = $stmt->fetch();

if (!$e) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['error' => 'Encaminhamento não encontrado.']);
    exit;
}

resolveVerificationUrl($pdo, 'encaminhamentos', 'encaminhamentos', $encId, $e);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respondVerificationInfo($e);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // NO se pasa contentHeightsMm acá (a diferencia de Pedidos): el
    // contenedor de PrintEncaminhamentoTemplate.tsx tiene minHeight:297mm +
    // un spacer flex:1 que lo estira SIEMPRE a la página completa, así que
    // pageHeightsMm (calculado en el navegador) reporta ~297mm exista o no
    // contenido real que invada el pie — la lógica de "cede si el contenido
    // invade" de signUploadedPdf() se disparaba en el 100% de los casos y
    // tiraba el texto legal hasta el borde inferior real (25mm), quedando
    // por debajo de la onda decorativa en vez de a la altura del QR de
    // verificación. Al no pasar contentHeightsMm, el pie usa siempre la
    // posición fija (footerFromBottomMm), que es la que coincide en altura
    // con la tarjeta QR (ver VerificationQrCard en el template).
    //
    // footerBoxWidthMm/footerBoxAlign: caja independiente anclada al margen
    // IZQUIERDO (no comparte columna con el QR, que el navegador dibuja
    // pegado al margen derecho) — quedan uno al lado del otro, a la misma
    // altura ($footerFromBottomMm), en vez de superpuestos. 125mm de ancho
    // deja ~17mm de aire antes de que arranque la tarjeta QR (~31mm de ancho,
    // pegada a 20mm del borde derecho).
    signUploadedPdf(
        'encaminhamento_' . $encId . '_assinado.pdf',
        DOCTOR_NAME,
        false,
        null,
        drawFooterText: true,
        footerFromBottomMm: 50.0,
        footerBoxWidthMm: 125.0,
        footerFontPt: 6.5,
        footerBoxAlign: 'left',
        table: 'encaminhamentos',
        id: $encId
    );
    exit;
}

header('Content-Type: application/json');
http_response_code(405);
echo json_encode(['error' => 'Método no permitido.']);

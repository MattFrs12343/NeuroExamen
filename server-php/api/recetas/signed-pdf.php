<?php
/**
 * /api/recetas/{id}/signed-pdf
 *
 * GET  → devuelve só {token, qrContent} (JSON, sem PDF) — o navegador usa
 *        isso pra desenhar o QR na própria plantilla de impressão real
 *        (PrintRecetaTemplate.tsx) antes de capturá-la.
 * POST → recebe (corpo bruto) o PDF que o navegador já capturou dessa
 *        mesma plantilla (html2canvas + jsPDF — ver src/lib/pdfCapture.ts)
 *        e devolve ele assinado digitalmente. NÃO reconstrói o desenho do
 *        zero: importa as páginas via FPDI e só acrescenta a firma legal
 *        real por cima — ver signUploadedPdf() em lib/signing.php para o
 *        porquê desta mudança de arquitetura.
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

$path     = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$parts    = explode('/', $path);
$idx      = array_search('recetas', $parts);
$recetaId = ($idx !== false && isset($parts[$idx + 1])) ? $parts[$idx + 1] : null;

if (!$recetaId) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'ID de receita no especificado.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('
    SELECT r.*, p.name AS patient_name
    FROM recetas r
    JOIN patients p ON p.id = r.patient_id
    WHERE r.id = ?
');
$stmt->execute([$recetaId]);
$r = $stmt->fetch();

if (!$r) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['error' => 'Receita não encontrada.']);
    exit;
}

resolveVerificationUrl($pdo, 'recetas', 'recetas', $recetaId, $r);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respondVerificationInfo($r);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // drawFooterText:true — mismo texto legal ICP-Brasil que Atestados/
    // Encaminhamentos/Fórmulas Infantis ("Assinado digitalmente conforme
    // ICP-Brasil (MP 2.200-2/2001) por NOME (CNPJ/CPF) em DD/MM/YYYY
    // HH:MM:SS. Verifique a autenticidade..."), pedido explícito para
    // Recetas también (antes estaba desactivado a pedido).
    // footerBoxAlign:'right' + footerBoxWidthMm angosto: caja compacta
    // pegada al margen inferior derecho — el QR de verificação en esta
    // plantilla va a la IZQUIERDA (al revés que Encaminhamentos), así que
    // el ángulo opuesto queda libre para el texto legal sin pisarse.
    // PrintRecetaTemplate.tsx ya no dibuja la línea en blanco "Assinatura e
    // Carimbo do Médico" mientras se firma — este texto ocupa ese lugar.
    //
    // NO se pasa contentHeightsMm (null) — mismo motivo que Encaminhamentos
    // (ver ese archivo): PrintRecetaTemplate.tsx ahora fuerza la página a
    // 297mm completos durante la captura (min-height + spacer flex:1, ver
    // index.css/PrintRecetaTemplate.tsx), así que el alto real capturado es
    // SIEMPRE ~297mm sin importar cuántos medicamentos tenga la receta — la
    // lógica de "cede si el contenido invade" de signUploadedPdf() se
    // disparaba siempre (falso positivo) y tiraba el pie a un lugar
    // impredecible según la receta. Con contentHeightsMm=null, el pie usa
    // SIEMPRE footerFromBottomMm=50 — que ahora sí es confiable porque el
    // bloque QR+firma queda anclado al mismo lugar (fondo real de la
    // página) en TODAS las recetas.
    //
    // signAllPages:true — cuando el médico pide "imprimir 2 vías"
    // (recetaPrintCopies=2 en el navegador, ver AppContext.tsx), el PDF
    // subido trae 2 páginas idénticas y cada una necesita su propio texto
    // legal, no solo la última. Con 1 página (caso normal) no cambia nada:
    // signAllPages sólo importa cuando hay más de una.
    signUploadedPdf(
        'receita_' . $recetaId . '_assinada.pdf',
        DOCTOR_NAME,
        true,
        null,
        drawFooterText: true,
        footerFromBottomMm: 50.0,
        footerBoxWidthMm: 95.0,
        footerFontPt: 6.0,
        footerBoxAlign: 'right',
        table: 'recetas',
        id: $recetaId
    );
    exit;
}

header('Content-Type: application/json');
http_response_code(405);
echo json_encode(['error' => 'Método no permitido.']);

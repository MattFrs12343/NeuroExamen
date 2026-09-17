<?php
/**
 * /api/receituarios/{id}/signed-pdf
 *
 * GET  → devuelve só {token, qrContent} (JSON, sem PDF) — o navegador usa
 *        isso pra desenhar o QR na própria plantilla de impressão real
 *        (PrintReceituarioTemplate.tsx) antes de capturá-la.
 * POST → recebe (corpo bruto) o PDF que o navegador já capturou dessa
 *        mesma plantilla (html2canvas + jsPDF — ver src/lib/pdfCapture.ts)
 *        e devolve ele assinado digitalmente — mesmo mecanismo que
 *        Recetas/Encaminhamentos/Pedidos (ver signUploadedPdf() em
 *        lib/signing.php).
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
$idx   = array_search('receituarios', $parts);
$id    = ($idx !== false && isset($parts[$idx + 1])) ? $parts[$idx + 1] : null;

if (!$id) {
    header('Content-Type: application/json');
    http_response_code(400);
    echo json_encode(['error' => 'ID de receituário no especificado.']);
    exit;
}

$pdo  = getDB();
$stmt = $pdo->prepare('SELECT * FROM receituarios WHERE id = ?');
$stmt->execute([$id]);
$r = $stmt->fetch();

if (!$r) {
    header('Content-Type: application/json');
    http_response_code(404);
    echo json_encode(['error' => 'Receituário não encontrado.']);
    exit;
}

resolveVerificationUrl($pdo, 'receituarios', 'receituarios', $id, $r);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respondVerificationInfo($r);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Uma única página (sem conceito de "vias" aquí) — signAllPages não
    // importa com 1 página, mas se passa false por clareza. QR desenhado
    // pelo navegador vai no canto inferior ESQUERDO da plantilla; o texto
    // legal ICP-Brasil (footerBoxAlign:'right') pousa no canto inferior
    // DIREITO — exatamente onde ficam os dados da clínica quando o
    // documento NÃO está sendo assinado (ver PrintReceituarioTemplate.tsx:
    // esse bloco troca dados-da-clínica por espaço em branco quando
    // isSigning, para não se sobrepor a este texto).
    signUploadedPdf(
        'receituario_' . $id . '_assinado.pdf',
        DOCTOR_NAME,
        false,
        null,
        drawFooterText: true,
        footerFromBottomMm: 58.0,
        footerBoxWidthMm: 95.0,
        footerFontPt: 6.0,
        footerBoxAlign: 'right',
        table: 'receituarios',
        id: $id
    );
    exit;
}

header('Content-Type: application/json');
http_response_code(405);
echo json_encode(['error' => 'Método no permitido.']);

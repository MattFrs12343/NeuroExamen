<?php
/**
 * /api/laudo-conclusoes — catálogo de la "Conclusão Pericial" del Laudo.
 *
 * GET    /api/laudo-conclusoes      lista ordenada (id, label)
 * POST   /api/laudo-conclusoes      { label }        → crea la opción
 * PUT    /api/laudo-conclusoes/:id  { label }        → edita el texto
 * DELETE /api/laudo-conclusoes/:id                 → elimina la opción
 *
 * Igual que /api/custom-exams y /api/medications: catálogo compartido, sin
 * scope por usuario (todos los médicos ven la misma lista).
 *
 * Editar o borrar una opción NO altera los laudos ya firmados: cada fila
 * guarda su propio snapshot de la lista en `laudos.conclusao_opcoes` (ver
 * lib/laudoConclusoes.php). Borrar solo saca la opción del catálogo para los
 * laudos futuros.
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/laudoConclusoes.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extrae el :id opcional de la URL  /api/laudo-conclusoes/{id}
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$optId     = ($lastPart !== 'laudo-conclusoes' && $lastPart !== 'index.php') ? $lastPart : null;

const LABEL_MAX = 500;

// ------------------------------------------------------------------
// GET /api/laudo-conclusoes
// ------------------------------------------------------------------
if ($method === 'GET' && !$optId) {
    $catalog = laudo_conclusoes_catalog($pdo);
    // Tabla sin migrar todavía → las 3 opciones originales, para que la
    // pantalla de Laudos siga funcionando y avise al correr la migración.
    echo json_encode($catalog ?? laudo_conclusoes_default());
    exit;
}

// A partir de acá se ESCRIBE: exigamos que la migración esté aplicada.
// El GET no pasa por acá — laudo_conclusoes_catalog() ya cae a las 3 opciones
// por defecto si la tabla no está (ver lib/laudoConclusoes.php), y así la app
// sigue funcionando, avisando, en vez de romperse al guardar.
if ($method !== 'GET') laudo_conclusoes_require_schema($pdo);

/** Corta la respuesta con un error y termina. */
function fail(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Envuelve una escritura y traduce cualquier error de base a un 500 CON
 * mensaje JSON.
 *
 * Sin esto, un PDOException sin capturar (violación de FK, clave duplicada,
 * deadlock) es un 500 de cuerpo VACÍO, porque el server corre con
 * display_errors=Off. En el navegador eso se ve como
 * "Failed to execute 'json' on 'Response': Unexpected end of JSON input":
 * un error que no dice absolutamente nada.
 *
 * El detalle técnico va al log de PHP; al usuario se le da un mensaje útil.
 */
function guard(callable $write): void {
    try {
        $write();
    } catch (PDOException $e) {
        error_log('[laudo-conclusoes] ' . $e->getMessage());
        fail(500, 'No se pudo guardar la conclusión. Detalle en el log del servidor.');
    }
}

/** Valida el texto de la opción: no vacío, dentro del límite y sin duplicados. */
function validateLabel(PDO $pdo, string $label, ?string $exceptId): void {
    if ($label === '') fail(400, 'El texto de la conclusión es requerido.');
    if (mb_strlen($label) > LABEL_MAX) {
        fail(400, 'El texto no puede superar los ' . LABEL_MAX . ' caracteres.');
    }

    // Sin duplicados (ignorando mayúsculas/espacios): dos "Apto(a)" en el
    // mismo listado no aportan nada y confunden en el PDF.
    $sql    = 'SELECT id FROM laudo_conclusoes WHERE LOWER(label) = LOWER(?)';
    $params = [$label];
    if ($exceptId !== null) {
        $sql     .= ' AND id <> ?';
        $params[] = $exceptId;
    }
    $dup = $pdo->prepare($sql . ' LIMIT 1');
    $dup->execute($params);
    if ($dup->fetch()) fail(409, 'Ya existe una conclusión con ese texto.');
}

// ------------------------------------------------------------------
// POST /api/laudo-conclusoes
// ------------------------------------------------------------------
if ($method === 'POST' && !$optId) {
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $label = trim((string)($body['label'] ?? ''));

    guard(function () use ($pdo, $label, $userId) {
        validateLabel($pdo, $label, null);

        $id = 'concl-' . bin2hex(random_bytes(8));

        $seq = $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM laudo_conclusoes');
        $nextOrder = (int)$seq->fetchColumn();

        $stmt = $pdo->prepare('INSERT INTO laudo_conclusoes (id, label, sort_order, created_by) VALUES (?, ?, ?, ?)');
        $stmt->execute([$id, $label, $nextOrder, $userId]);

        http_response_code(201);
        echo json_encode(['id' => $id, 'label' => $label], JSON_UNESCAPED_UNICODE);
    });
    exit;
}

// ------------------------------------------------------------------
// PUT /api/laudo-conclusoes/:id — editar el texto
// ------------------------------------------------------------------
if ($method === 'PUT' && $optId) {
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $label = trim((string)($body['label'] ?? ''));

    guard(function () use ($pdo, $label, $optId) {
        validateLabel($pdo, $label, $optId);

        $stmt = $pdo->prepare('UPDATE laudo_conclusoes SET label = ? WHERE id = ?');
        $stmt->execute([$label, $optId]);

        if ($stmt->rowCount() === 0) {
            // rowCount() es 0 también cuando el texto no cambió: se confirma
            // existencia antes de decir que no existe.
            $chk = $pdo->prepare('SELECT id FROM laudo_conclusoes WHERE id = ?');
            $chk->execute([$optId]);
            if (!$chk->fetch()) fail(404, 'Conclusión no encontrada.');
        }

        echo json_encode(['id' => $optId, 'label' => $label], JSON_UNESCAPED_UNICODE);
    });
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/laudo-conclusoes/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $optId) {
    guard(function () use ($pdo, $optId) {
        $stmt = $pdo->prepare('DELETE FROM laudo_conclusoes WHERE id = ?');
        $stmt->execute([$optId]);

        if ($stmt->rowCount() === 0) {
            $chk = $pdo->prepare('SELECT id FROM laudo_conclusoes WHERE id = ?');
            $chk->execute([$optId]);
            if (!$chk->fetch()) fail(404, 'Conclusión no encontrada.');
        }

        echo json_encode(['success' => true]);
    });
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

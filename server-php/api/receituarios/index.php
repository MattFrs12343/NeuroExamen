<?php
/**
 * /api/receituarios — GET (listado + filtros), POST, PUT /:id, DELETE /:id.
 *
 * A diferencia de Recetas/Atestados/etc., Receituário no vincula un
 * patientId real de la tabla `patients` (patient_name/patient_phone son
 * texto libre — ver Receituario.tsx). El listado (ReceituariosList.tsx)
 * sigue el mismo patrón que RecetasList: se trae todo (con filtros
 * opcionales de paciente/fecha) y se pagina/filtra en el cliente.
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/signing.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extrae el :id opcional de la URL, ej: /api/receituarios/RCT-2026-0001
$pathParts      = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart       = end($pathParts);
$receituarioId  = ($lastPart !== 'receituarios' && $lastPart !== 'index.php') ? $lastPart : null;

function formatReceituario(array $row): array {
    return [
        'id'               => $row['id'],
        'clinicName'       => $row['clinic_name']       ?: null,
        'clinicSecretaria' => $row['clinic_secretaria'] ?: null,
        'clinicSistema'    => $row['clinic_sistema']    ?: null,
        'clinicAddress'    => $row['clinic_address']    ?: null,
        'clinicPhone'      => $row['clinic_phone']      ?: null,
        'clinicCnpj'       => $row['clinic_cnpj']       ?: null,
        'patientName'      => $row['patient_name']      ?: null,
        'patientPhone'     => $row['patient_phone']     ?: null,
        'date'             => $row['date']              ?: null,
        'content'          => $row['content'],
        'createdBy'        => $row['user_name'],
        'token'            => $row['token']          ?: null,
        'accessCode'       => $row['access_code']    ?: null,
        'validationUrl'    => $row['validation_url'] ?: null,
    ];
}

// ------------------------------------------------------------------
// GET /api/receituarios — listado, con filtros opcionales
// ------------------------------------------------------------------
if ($method === 'GET' && !$receituarioId) {
    $params = $_GET;
    $where  = ['1=1'];
    $bind   = [];

    if (!empty($params['patient'])) {
        $where[] = 'r.patient_name LIKE ?';
        $bind[]  = '%' . $params['patient'] . '%';
    }
    if (!empty($params['startDate'])) {
        $where[] = 'r.date >= ?';
        $bind[]  = $params['startDate'];
    }
    if (!empty($params['endDate'])) {
        $where[] = 'r.date <= ?';
        $bind[]  = $params['endDate'];
    }

    $sql = '
        SELECT r.*, u.name AS user_name
        FROM receituarios r
        JOIN users u ON u.id = r.user_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY r.created_at DESC
    ';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);
    $rows = $stmt->fetchAll();

    echo json_encode(array_map('formatReceituario', $rows));
    exit;
}

// ------------------------------------------------------------------
// POST /api/receituarios
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body       = json_decode(file_get_contents('php://input'), true) ?? [];
    $clinicName = $body['clinicName']       ?? null;
    $secretaria = $body['clinicSecretaria'] ?? null;
    $sistema    = $body['clinicSistema']    ?? null;
    $address    = $body['clinicAddress']    ?? null;
    $phone      = $body['clinicPhone']      ?? null;
    $cnpj       = $body['clinicCnpj']       ?? null;
    $patientName  = $body['patientName']  ?? null;
    $patientPhone = $body['patientPhone'] ?? null;
    $date       = $body['date']             ?: null;
    $content    = trim($body['content']     ?? '');

    if ($content === '') {
        http_response_code(400);
        echo json_encode(['error' => 'O conteúdo do receituário é obrigatório.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec("INSERT INTO receituario_counter (year) VALUES (YEAR(CURDATE()))
                    ON DUPLICATE KEY UPDATE seq = seq + 1");
        $row   = $pdo->query("SELECT seq FROM receituario_counter WHERE year = YEAR(CURDATE())")->fetch();
        $newId = 'RCT-' . date('Y') . '-' . str_pad((int)$row['seq'], 4, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare(
            'INSERT INTO receituarios (
                id, user_id, clinic_name, clinic_secretaria, clinic_sistema,
                clinic_address, clinic_phone, clinic_cnpj, patient_name, patient_phone, date, content
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $newId, $userId, $clinicName, $secretaria, $sistema,
            $address, $phone, $cnpj, $patientName, $patientPhone, $date, $content,
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao criar receituário: ' . $e->getMessage()]);
        exit;
    }

    generateVerificationInfo($pdo, 'receituarios', 'receituarios', $newId);

    $stmt = $pdo->prepare('
        SELECT r.*, u.name AS user_name
        FROM receituarios r
        JOIN users u ON u.id = r.user_id
        WHERE r.id = ?
    ');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();

    http_response_code(201);
    echo json_encode(formatReceituario($row));
    exit;
}

// ------------------------------------------------------------------
// PUT /api/receituarios/:id
// ------------------------------------------------------------------
if ($method === 'PUT' && $receituarioId) {
    $body       = json_decode(file_get_contents('php://input'), true) ?? [];
    $clinicName = $body['clinicName']       ?? null;
    $secretaria = $body['clinicSecretaria'] ?? null;
    $sistema    = $body['clinicSistema']    ?? null;
    $address    = $body['clinicAddress']    ?? null;
    $phone      = $body['clinicPhone']      ?? null;
    $cnpj       = $body['clinicCnpj']       ?? null;
    $patientName  = $body['patientName']  ?? null;
    $patientPhone = $body['patientPhone'] ?? null;
    $date       = $body['date']             ?: null;
    $content    = trim($body['content']     ?? '');

    if ($content === '') {
        http_response_code(400);
        echo json_encode(['error' => 'O conteúdo do receituário é obrigatório.']);
        exit;
    }

    $upd = $pdo->prepare(
        'UPDATE receituarios SET
            clinic_name=?, clinic_secretaria=?, clinic_sistema=?, clinic_address=?, clinic_phone=?, clinic_cnpj=?,
            patient_name=?, patient_phone=?, date=?, content=?
         WHERE id=?'
    );
    $upd->execute([
        $clinicName, $secretaria, $sistema, $address, $phone, $cnpj,
        $patientName, $patientPhone, $date, $content,
        $receituarioId,
    ]);

    $stmt = $pdo->prepare('
        SELECT r.*, u.name AS user_name
        FROM receituarios r
        JOIN users u ON u.id = r.user_id
        WHERE r.id = ?
    ');
    $stmt->execute([$receituarioId]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Receituário não encontrado.']);
        exit;
    }

    echo json_encode(formatReceituario($row));
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/receituarios/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $receituarioId) {
    $stmt = $pdo->prepare('DELETE FROM receituarios WHERE id = ?');
    $stmt->execute([$receituarioId]);
    echo json_encode(['success' => true, 'message' => 'Receituário eliminado con éxito.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

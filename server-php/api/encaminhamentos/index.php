<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/signing.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extract optional :id from URL  e.g. /api/encaminhamentos/ENC-2026-0001
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$encId     = ($lastPart !== 'encaminhamentos' && $lastPart !== 'index.php') ? $lastPart : null;

// Helper: format a DB row + specialist ids array into frontend shape
function formatEncaminhamento(array $row, array $specialistIds): array {
    return [
        'id'               => $row['id'],
        'patientId'        => $row['patient_id'],
        'patientName'      => $row['patient_name'],
        'patientIdentityCard' => $row['patient_identity_card'],
        'date'             => $row['date'],
        'patientAge'       => $row['patient_age'] ?: null,
        'patientPhone'     => $row['patient_phone'] ?: null,
        'hd'               => $row['hd']          ?: null,
        'motivo'           => $row['motivo']      ?: null,
        'clinicName'       => $row['clinic_name']       ?: null,
        'clinicSecretaria' => $row['clinic_secretaria'] ?: null,
        'clinicSistema'    => $row['clinic_sistema']    ?: null,
        'clinicAddress'    => $row['clinic_address']    ?: null,
        'clinicPhone'      => $row['clinic_phone']      ?: null,
        'clinicCnpj'       => $row['clinic_cnpj']       ?: null,
        'templateId'       => $row['template_id'] ?: 'neuromobius',
        'specialists'      => $specialistIds,
        'createdBy'        => $row['user_name'],
        'token'            => $row['token']          ?: null,
        'accessCode'       => $row['access_code']    ?: null,
        'validationUrl'    => $row['validation_url'] ?: null,
    ];
}

// Helper: fetch specialist ids for an encaminhamento
function getSpecialistIds(PDO $pdo, string $encId): array {
    $s = $pdo->prepare('SELECT specialist_id FROM encaminhamento_specialists WHERE encaminhamento_id = ?');
    $s->execute([$encId]);
    return array_column($s->fetchAll(), 'specialist_id');
}

// ------------------------------------------------------------------
// GET /api/encaminhamentos
// ------------------------------------------------------------------
if ($method === 'GET' && !$encId) {
    $params = $_GET;
    $where  = ['1=1'];
    $bind   = [];

    if (!empty($params['startDate'])) {
        $where[] = 'e.date >= ?';
        $bind[]  = $params['startDate'];
    }

    if (!empty($params['endDate'])) {
        $where[] = 'e.date <= ?';
        $bind[]  = $params['endDate'];
    }

    if (!empty($params['patient'])) {
        $where[] = '(p.name LIKE ? OR p.identity_card LIKE ?)';
        $like    = '%' . $params['patient'] . '%';
        $bind[]  = $like;
        $bind[]  = $like;
    }

    $sql = '
        SELECT
            e.*,
            p.name AS patient_name, p.identity_card AS patient_identity_card,
            u.name AS user_name
        FROM encaminhamentos e
        JOIN patients p ON p.id = e.patient_id
        JOIN users   u ON u.id = e.user_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY e.created_at DESC
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $specialistIds = getSpecialistIds($pdo, $row['id']);
        $result[]      = formatEncaminhamento($row, $specialistIds);
    }

    echo json_encode($result);
    exit;
}

// ------------------------------------------------------------------
// POST /api/encaminhamentos
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body          = json_decode(file_get_contents('php://input'), true) ?? [];
    $patientId     = $body['patientId']     ?? '';
    $date          = !empty($body['date']) ? $body['date'] : null;
    $patientAge    = $body['patientAge']    ?? null;
    $patientPhone  = $body['patientPhone']  ?? null;
    $hd            = $body['hd']            ?? null;
    $motivo        = $body['motivo']        ?? null;
    $clinicName    = $body['clinicName']    ?? null;
    $clinicSecretaria = $body['clinicSecretaria'] ?? null;
    $clinicSistema = $body['clinicSistema'] ?? null;
    $clinicAddress = $body['clinicAddress'] ?? null;
    $clinicPhone   = $body['clinicPhone']   ?? null;
    $clinicCnpj    = $body['clinicCnpj']    ?? null;
    $templateId    = in_array($body['templateId'] ?? null, ['neuromobius', 'neuroisbe'], true)
                         ? $body['templateId']
                         : 'neuromobius';
    $specialistIds = $body['specialists']   ?? [];

    if (!$patientId || empty($specialistIds)) {
        http_response_code(400);
        echo json_encode(['error' => 'Campos requeridos incompletos.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec("INSERT INTO encaminhamento_counter (year) VALUES (YEAR(CURDATE()))
                    ON DUPLICATE KEY UPDATE seq = seq + 1");
        $row   = $pdo->query("SELECT seq FROM encaminhamento_counter WHERE year = YEAR(CURDATE())")->fetch();
        $newId = 'ENC-' . date('Y') . '-' . str_pad((int)$row['seq'], 4, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare(
            'INSERT INTO encaminhamentos (
                id, patient_id, user_id, date, patient_age, patient_phone, hd, motivo, clinic_name,
                clinic_secretaria, clinic_sistema, clinic_address, clinic_phone, clinic_cnpj,
                template_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $newId, $patientId, $userId, $date, $patientAge, $patientPhone, $hd, $motivo, $clinicName,
            $clinicSecretaria, $clinicSistema, $clinicAddress, $clinicPhone, $clinicCnpj,
            $templateId,
        ]);

        $pivot = $pdo->prepare('INSERT INTO encaminhamento_specialists (encaminhamento_id, specialist_id) VALUES (?, ?)');
        foreach ($specialistIds as $sid) {
            $pivot->execute([$newId, $sid]);
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear encaminhamento: ' . $e->getMessage()]);
        exit;
    }

    generateVerificationInfo($pdo, 'encaminhamentos', 'encaminhamentos', $newId);

    $stmt = $pdo->prepare('
        SELECT e.*, p.name AS patient_name, p.identity_card AS patient_identity_card, u.name AS user_name
        FROM encaminhamentos e
        JOIN patients p ON p.id = e.patient_id
        JOIN users   u ON u.id = e.user_id
        WHERE e.id = ?
    ');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();

    http_response_code(201);
    echo json_encode(formatEncaminhamento($row, $specialistIds));
    exit;
}

// ------------------------------------------------------------------
// PUT /api/encaminhamentos/:id
// ------------------------------------------------------------------
if ($method === 'PUT' && $encId) {
    $body          = json_decode(file_get_contents('php://input'), true) ?? [];
    $date          = !empty($body['date']) ? $body['date'] : null;
    $patientAge    = $body['patientAge']    ?? null;
    $patientPhone  = $body['patientPhone']  ?? null;
    $hd            = $body['hd']            ?? null;
    $motivo        = $body['motivo']        ?? null;
    $clinicName    = $body['clinicName']    ?? null;
    $clinicSecretaria = $body['clinicSecretaria'] ?? null;
    $clinicSistema = $body['clinicSistema'] ?? null;
    $clinicAddress = $body['clinicAddress'] ?? null;
    $clinicPhone   = $body['clinicPhone']   ?? null;
    $clinicCnpj    = $body['clinicCnpj']    ?? null;
    $templateId    = in_array($body['templateId'] ?? null, ['neuromobius', 'neuroisbe'], true)
                         ? $body['templateId']
                         : 'neuromobius';
    $specialistIds = $body['specialists']   ?? [];

    if (empty($specialistIds)) {
        http_response_code(400);
        echo json_encode(['error' => 'Debe seleccionar al menos un especialista.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $upd = $pdo->prepare(
            'UPDATE encaminhamentos SET
                date=?, patient_age=?, patient_phone=?, hd=?, motivo=?, clinic_name=?,
                clinic_secretaria=?, clinic_sistema=?, clinic_address=?, clinic_phone=?, clinic_cnpj=?,
                template_id=?
             WHERE id=?'
        );
        $upd->execute([
            $date, $patientAge, $patientPhone, $hd, $motivo, $clinicName,
            $clinicSecretaria, $clinicSistema, $clinicAddress, $clinicPhone, $clinicCnpj,
            $templateId, $encId,
        ]);

        $del = $pdo->prepare('DELETE FROM encaminhamento_specialists WHERE encaminhamento_id = ?');
        $del->execute([$encId]);

        $pivot = $pdo->prepare('INSERT INTO encaminhamento_specialists (encaminhamento_id, specialist_id) VALUES (?, ?)');
        foreach ($specialistIds as $sid) {
            $pivot->execute([$encId, $sid]);
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar encaminhamento: ' . $e->getMessage()]);
        exit;
    }

    $stmt = $pdo->prepare('
        SELECT e.*, p.name AS patient_name, p.identity_card AS patient_identity_card, u.name AS user_name
        FROM encaminhamentos e
        JOIN patients p ON p.id = e.patient_id
        JOIN users   u ON u.id = e.user_id
        WHERE e.id = ?
    ');
    $stmt->execute([$encId]);
    $row = $stmt->fetch();

    echo json_encode(formatEncaminhamento($row, $specialistIds));
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/encaminhamentos/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $encId) {
    $stmt = $pdo->prepare('DELETE FROM encaminhamentos WHERE id = ?');
    $stmt->execute([$encId]);
    echo json_encode(['success' => true, 'message' => 'Encaminhamento eliminado con éxito.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

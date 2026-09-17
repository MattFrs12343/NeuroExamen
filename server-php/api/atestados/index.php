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

// Extract optional :id from URL  e.g. /api/atestados/ATE-2026-0001
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$atestadoId = ($lastPart !== 'atestados' && $lastPart !== 'index.php') ? $lastPart : null;

// Helper: format a DB row into frontend shape
function formatAtestado(array $row): array {
    return [
        'id'                      => $row['id'],
        'patientId'               => $row['patient_id'],
        'patientName'             => $row['patient_name'],
        'patientIdentityCard'     => $row['patient_identity_card'],
        'patientBirthDate'        => $row['patient_birth_date'] ?: null,
        'patientAddress'          => $row['patient_address']    ?: null,
        'patientPhone'            => $row['patient_phone']      ?: null,
        'clinicName'              => $row['clinic_name']        ?: null,
        'clinicSecretaria'        => $row['clinic_secretaria']  ?: null,
        'clinicSistema'           => $row['clinic_sistema']     ?: null,
        'clinicAddress'           => $row['clinic_address']     ?: null,
        'clinicPhone'             => $row['clinic_phone']       ?: null,
        'clinicCnpj'              => $row['clinic_cnpj']        ?: null,
        'issuedAt'                => $row['issued_at']          ?: null,
        'token'                   => $row['token']              ?: null,
        'accessCode'              => $row['access_code']        ?: null,
        'validationUrl'           => $row['validation_url']     ?: null,
        'qrContent'               => $row['qr_content']         ?: null,
        'cid'                     => $row['cid']                ?: null,
        'careStartTime'           => $row['care_start_time']    ?: null,
        'careEndTime'             => $row['care_end_time']      ?: null,
        'careDate'                => $row['care_date']          ?: null,
        'restDays'                => $row['rest_days']          ?: null,
        'observation'             => $row['observation']        ?: null,
        'doctorName'              => $row['doctor_name']        ?: null,
        'doctorCrm'               => $row['doctor_crm']         ?: null,
        'doctorAddress'           => $row['doctor_address']     ?: null,
        'signedAt'                => $row['signed_at']          ?: null,
        'digitalPrescriptionUrl'  => $row['digital_prescription_url'] ?: null,
        'createdBy'               => $row['user_name'],
    ];
}

// Normaliza una fecha en formato brasileño (DD/MM/YYYY[ - HH:MM[:SS]]) a ISO
// (YYYY-MM-DD[ HH:MM:SS]). Passthrough si ya viene en ISO o no es reconocible.
function dateToIso(?string $value): ?string {
    if ($value === null || trim($value) === '') { return $value; }
    $v = trim($value);
    return preg_replace_callback(
        '/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: - | )(\d{2}):(\d{2})(?::(\d{2}))?$/',
        function (array $m): string {
            $time = $m[4] . ':' . $m[5] . (isset($m[6]) && $m[6] !== '' ? ':' . $m[6] : ':00');
            return "{$m[3]}-" . str_pad($m[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($m[1], 2, '0', STR_PAD_LEFT) . " {$time}";
        },
        preg_replace_callback(
            '/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/',
            function (array $m): string {
                return "{$m[3]}-" . str_pad($m[2], 2, '0', STR_PAD_LEFT) . '-' . str_pad($m[1], 2, '0', STR_PAD_LEFT);
            },
            $v
        )
    ) ?? $v;
}

// Helper: pick only the allowed fields from the body (avoids column injection)
function atestadoPayload(array $body): array {
    $keys = [
        'patientId', 'patientBirthDate', 'patientAddress', 'patientPhone', 'clinicName',
        'clinicSecretaria', 'clinicSistema', 'clinicAddress', 'clinicPhone',
        'clinicCnpj', 'issuedAt', 'token',
        'accessCode', 'validationUrl', 'qrContent', 'cid', 'careStartTime',
        'careEndTime', 'careDate', 'restDays', 'observation', 'doctorName',
        'doctorCrm', 'doctorAddress', 'signedAt', 'digitalPrescriptionUrl',
    ];
    $payload = [];
    foreach ($keys as $key) {
        $payload[$key] = $body[$key] ?? null;
    }
    foreach (['patientBirthDate', 'issuedAt', 'careDate', 'signedAt'] as $dateKey) {
        $payload[$dateKey] = dateToIso($payload[$dateKey]);
    }
    return $payload;
}

// ------------------------------------------------------------------
// GET /api/atestados
// ------------------------------------------------------------------
if ($method === 'GET' && !$atestadoId) {
    $params = $_GET;
    $where  = ['1=1'];
    $bind   = [];

    if (!empty($params['startDate'])) {
        $where[] = 'a.created_at >= ?';
        $bind[]  = $params['startDate'] . ' 00:00:00';
    }

    if (!empty($params['endDate'])) {
        $where[] = 'a.created_at <= ?';
        $bind[]  = $params['endDate'] . ' 23:59:59';
    }

    if (!empty($params['patient'])) {
        $where[] = '(p.name LIKE ? OR p.identity_card LIKE ?)';
        $like    = '%' . $params['patient'] . '%';
        $bind[]  = $like;
        $bind[]  = $like;
    }

    $sql = '
        SELECT
            a.*,
            p.name AS patient_name, p.identity_card AS patient_identity_card,
            u.name AS user_name
        FROM atestados a
        JOIN patients p ON p.id = a.patient_id
        JOIN users   u ON u.id = a.user_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY a.created_at DESC
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);
    $rows = $stmt->fetchAll();

    echo json_encode(array_map('formatAtestado', $rows));
    exit;
}

// ------------------------------------------------------------------
// POST /api/atestados
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body      = json_decode(file_get_contents('php://input'), true) ?? [];
    $patientId = $body['patientId'] ?? '';

    if (!$patientId) {
        http_response_code(400);
        echo json_encode(['error' => 'Campos requeridos incompletos.']);
        exit;
    }

    $payload = atestadoPayload($body);

    $pdo->beginTransaction();
    try {
        $pdo->exec("INSERT INTO atestado_counter (year) VALUES (YEAR(CURDATE()))
                    ON DUPLICATE KEY UPDATE seq = seq + 1");
        $row   = $pdo->query("SELECT seq FROM atestado_counter WHERE year = YEAR(CURDATE())")->fetch();
        $newId = 'ATE-' . date('Y') . '-' . str_pad((int)$row['seq'], 4, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare(
            'INSERT INTO atestados (
                id, patient_id, user_id,
                patient_birth_date, patient_address, patient_phone, issued_at, token, access_code,
                validation_url, qr_content, cid, care_start_time, care_end_time,
                care_date, rest_days, observation, doctor_name, doctor_crm,
                doctor_address, signed_at, digital_prescription_url,
                clinic_name, clinic_secretaria, clinic_sistema, clinic_address, clinic_phone, clinic_cnpj
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $newId, $patientId, $userId,
            $payload['patientBirthDate'], $payload['patientAddress'], $payload['patientPhone'], $payload['issuedAt'],
            $payload['token'], $payload['accessCode'], $payload['validationUrl'],
            $payload['qrContent'], $payload['cid'], $payload['careStartTime'],
            $payload['careEndTime'], $payload['careDate'], $payload['restDays'],
            $payload['observation'], $payload['doctorName'], $payload['doctorCrm'],
            $payload['doctorAddress'], $payload['signedAt'], $payload['digitalPrescriptionUrl'],
            $payload['clinicName'], $payload['clinicSecretaria'], $payload['clinicSistema'],
            $payload['clinicAddress'], $payload['clinicPhone'], $payload['clinicCnpj'],
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear atestado: ' . $e->getMessage()]);
        exit;
    }

    // Atestados a veces se cargan a mano con token/código de Mevo (importados
    // del otro sistema) — solo generamos el nuestro si no vino ninguno, para
    // no pisar un código real ya existente.
    if (empty($payload['token'])) {
        generateVerificationInfo($pdo, 'atestados', 'atestados', $newId);
    }

    $stmt = $pdo->prepare('
        SELECT a.*, p.name AS patient_name, p.identity_card AS patient_identity_card, u.name AS user_name
        FROM atestados a
        JOIN patients p ON p.id = a.patient_id
        JOIN users   u ON u.id = a.user_id
        WHERE a.id = ?
    ');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();

    http_response_code(201);
    echo json_encode(formatAtestado($row));
    exit;
}

// ------------------------------------------------------------------
// PUT /api/atestados/:id
// ------------------------------------------------------------------
if ($method === 'PUT' && $atestadoId) {
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $payload = atestadoPayload($body);

    $stmt = $pdo->prepare(
        'UPDATE atestados SET
            patient_birth_date=?, patient_address=?, patient_phone=?, issued_at=?, token=?, access_code=?,
            validation_url=?, qr_content=?, cid=?, care_start_time=?, care_end_time=?,
            care_date=?, rest_days=?, observation=?, doctor_name=?, doctor_crm=?,
            doctor_address=?, signed_at=?, digital_prescription_url=?,
            clinic_name=?, clinic_secretaria=?, clinic_sistema=?, clinic_address=?, clinic_phone=?, clinic_cnpj=?
         WHERE id=?'
    );
    $stmt->execute([
        $payload['patientBirthDate'], $payload['patientAddress'], $payload['patientPhone'], $payload['issuedAt'],
        $payload['token'], $payload['accessCode'], $payload['validationUrl'],
        $payload['qrContent'], $payload['cid'], $payload['careStartTime'],
        $payload['careEndTime'], $payload['careDate'], $payload['restDays'],
        $payload['observation'], $payload['doctorName'], $payload['doctorCrm'],
        $payload['doctorAddress'], $payload['signedAt'], $payload['digitalPrescriptionUrl'],
        $payload['clinicName'], $payload['clinicSecretaria'], $payload['clinicSistema'],
        $payload['clinicAddress'], $payload['clinicPhone'], $payload['clinicCnpj'],
        $atestadoId,
    ]);

    $stmt = $pdo->prepare('
        SELECT a.*, p.name AS patient_name, p.identity_card AS patient_identity_card, u.name AS user_name
        FROM atestados a
        JOIN patients p ON p.id = a.patient_id
        JOIN users   u ON u.id = a.user_id
        WHERE a.id = ?
    ');
    $stmt->execute([$atestadoId]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Atestado no encontrado.']);
        exit;
    }

    echo json_encode(formatAtestado($row));
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/atestados/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $atestadoId) {
    $stmt = $pdo->prepare('DELETE FROM atestados WHERE id = ?');
    $stmt->execute([$atestadoId]);
    echo json_encode(['success' => true, 'message' => 'Atestado eliminado con éxito.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

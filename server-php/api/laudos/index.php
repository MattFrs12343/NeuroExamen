<?php
/**
 * /api/laudos — GET (listado + filtros), POST, PUT /:id, DELETE /:id.
 *
 * Una fila por Laudo Pericial Médico. Los datos del paciente (nombre, data
 * de nacimiento, CPF, órgão) son texto libre como en Receituário — no se
 * hace JOIN con `patients` (el nombre puede venir de la búsqueda o tipeado
 * a mano). Los datos del emisor (clínica, médico, CRM) se almacenan como
 * snapshot desde el perfil de clínica del laudo (laudoProfiles.ts) para que
 * sigan mostrándose aunque el perfil cambie después.
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

// Extrae el :id opcional de la URL, ej: /api/laudos/LAU-2026-0001
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$laudoId   = ($lastPart !== 'laudos' && $lastPart !== 'index.php') ? $lastPart : null;

function formatLaudo(array $row): array {
    return [
        'id'                    => $row['id'],
        'patientId'             => $row['patient_id']             ?: null,
        'patientName'           => $row['patient_name']           ?: null,
        'patientIdentityCard'   => $row['patient_identity_card']  ?: null,
        'patientBirthDate'      => $row['patient_birth_date']     ?: null,
        'patientPhone'          => $row['patient_phone']          ?: null,
        'orgao'                 => $row['orgao']                  ?: null,
        'date'                  => $row['date']                   ?: null,
        'local'                 => $row['local']                  ?: null,
        'narrative'             => $row['narrative'],
        'cids'                  => $row['cids']                   ?: null,
        'diagnostico'           => $row['diagnostico']            ?: null,
        'conclusao'             => $row['conclusao']              ?: null,
        'afastamentoDias'       => $row['afastamento_dias']       !== null ? (int)$row['afastamento_dias'] : null,
        'observacoes'           => $row['observacoes'],
        'clinicName'            => $row['clinic_name']            ?: null,
        'clinicAddress'         => $row['clinic_address']         ?: null,
        'clinicPhone'           => $row['clinic_phone']           ?: null,
        'doctorName'            => $row['doctor_name']            ?: null,
        'doctorCrm'             => $row['doctor_crm']             ?: null,
        'templateId'            => $row['template_id']            ?: null,
        'createdBy'             => $row['user_name'],
        'token'                 => $row['token']                  ?: null,
        'accessCode'            => $row['access_code']            ?: null,
        'validationUrl'         => $row['validation_url']         ?: null,
    ];
}

// ------------------------------------------------------------------
// GET /api/laudos — listado, con filtros opcionales
// ------------------------------------------------------------------
if ($method === 'GET' && !$laudoId) {
    $params = $_GET;
    $where  = ['1=1'];
    $bind   = [];

    if (!empty($params['patient'])) {
        $where[] = 'l.patient_name LIKE ?';
        $bind[]  = '%' . $params['patient'] . '%';
    }
    if (!empty($params['startDate'])) {
        $where[] = 'l.date >= ?';
        $bind[]  = $params['startDate'];
    }
    if (!empty($params['endDate'])) {
        $where[] = 'l.date <= ?';
        $bind[]  = $params['endDate'];
    }

    $sql = '
        SELECT l.*, u.name AS user_name
        FROM laudos l
        JOIN users u ON u.id = l.user_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY l.created_at DESC
    ';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);
    $rows = $stmt->fetchAll();

    echo json_encode(array_map('formatLaudo', $rows));
    exit;
}

// ------------------------------------------------------------------
// POST /api/laudos
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $fields = [
        'patientId', 'patientName', 'patientIdentityCard', 'patientBirthDate', 'patientPhone',
        'orgao', 'date', 'local', 'narrative', 'cids', 'diagnostico', 'conclusao',
        'afastamentoDias', 'observacoes', 'clinicName', 'clinicAddress', 'clinicPhone',
        'doctorName', 'doctorCrm', 'templateId',
    ];
    $data = [];
    foreach ($fields as $f) {
        $data[$f] = $body[$f] ?? null;
    }
    $data['narrative'] = trim((string)($data['narrative'] ?? ''));

    if ($data['narrative'] === '') {
        http_response_code(400);
        echo json_encode(['error' => 'A narrativa clínica do laudo é obrigatória.']);
        exit;
    }
    if (empty($data['patientName'])) {
        http_response_code(400);
        echo json_encode(['error' => 'O nome do paciente é obrigatório.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec("INSERT INTO laudo_counter (year) VALUES (YEAR(CURDATE()))
                    ON DUPLICATE KEY UPDATE seq = seq + 1");
        $row   = $pdo->query("SELECT seq FROM laudo_counter WHERE year = YEAR(CURDATE())")->fetch();
        $newId = 'LAU-' . date('Y') . '-' . str_pad((int)$row['seq'], 4, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare(
            'INSERT INTO laudos (
                id, user_id, patient_id, patient_name, patient_identity_card,
                patient_birth_date, patient_phone, orgao, date, local, narrative,
                cids, diagnostico, conclusao, afastamento_dias, observacoes,
                clinic_name, clinic_address, clinic_phone,
                doctor_name, doctor_crm, template_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $newId, $userId,
            $data['patientId'],
            $data['patientName'],
            $data['patientIdentityCard'],
            $data['patientBirthDate'],
            $data['patientPhone'],
            $data['orgao'],
            $data['date'],
            $data['local'],
            $data['narrative'],
            $data['cids'],
            $data['diagnostico'],
            $data['conclusao'],
            $data['afastamentoDias'] !== null && $data['afastamentoDias'] !== '' ? (int)$data['afastamentoDias'] : null,
            $data['observacoes'],
            $data['clinicName'],
            $data['clinicAddress'],
            $data['clinicPhone'],
            $data['doctorName'],
            $data['doctorCrm'],
            $data['templateId'],
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao criar laudo: ' . $e->getMessage()]);
        exit;
    }

    generateVerificationInfo($pdo, 'laudos', 'laudos', $newId);

    $stmt = $pdo->prepare('
        SELECT l.*, u.name AS user_name
        FROM laudos l
        JOIN users u ON u.id = l.user_id
        WHERE l.id = ?
    ');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();

    http_response_code(201);
    echo json_encode(formatLaudo($row));
    exit;
}

// ------------------------------------------------------------------
// PUT /api/laudos/:id
// ------------------------------------------------------------------
if ($method === 'PUT' && $laudoId) {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $fields = [
        'patientId', 'patientName', 'patientIdentityCard', 'patientBirthDate', 'patientPhone',
        'orgao', 'date', 'local', 'narrative', 'cids', 'diagnostico', 'conclusao',
        'afastamentoDias', 'observacoes', 'clinicName', 'clinicAddress', 'clinicPhone',
        'doctorName', 'doctorCrm', 'templateId',
    ];
    $data = [];
    foreach ($fields as $f) {
        $data[$f] = $body[$f] ?? null;
    }
    $data['narrative'] = trim((string)($data['narrative'] ?? ''));

    if ($data['narrative'] === '') {
        http_response_code(400);
        echo json_encode(['error' => 'A narrativa clínica do laudo é obrigatória.']);
        exit;
    }
    if (empty($data['patientName'])) {
        http_response_code(400);
        echo json_encode(['error' => 'O nome do paciente é obrigatório.']);
        exit;
    }

    $upd = $pdo->prepare(
        'UPDATE laudos SET
            patient_id=?, patient_name=?, patient_identity_card=?, patient_birth_date=?,
            patient_phone=?, orgao=?, date=?, local=?, narrative=?, cids=?, diagnostico=?,
            conclusao=?, afastamento_dias=?, observacoes=?, clinic_name=?, clinic_address=?,
            clinic_phone=?, doctor_name=?, doctor_crm=?, template_id=?
         WHERE id=?'
    );
    $upd->execute([
        $data['patientId'],
        $data['patientName'],
        $data['patientIdentityCard'],
        $data['patientBirthDate'],
        $data['patientPhone'],
        $data['orgao'],
        $data['date'],
        $data['local'],
        $data['narrative'],
        $data['cids'],
        $data['diagnostico'],
        $data['conclusao'],
        $data['afastamentoDias'] !== null && $data['afastamentoDias'] !== '' ? (int)$data['afastamentoDias'] : null,
        $data['observacoes'],
        $data['clinicName'],
        $data['clinicAddress'],
        $data['clinicPhone'],
        $data['doctorName'],
        $data['doctorCrm'],
        $data['templateId'],
        $laudoId,
    ]);

    $stmt = $pdo->prepare('
        SELECT l.*, u.name AS user_name
        FROM laudos l
        JOIN users u ON u.id = l.user_id
        WHERE l.id = ?
    ');
    $stmt->execute([$laudoId]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Laudo não encontrado.']);
        exit;
    }

    echo json_encode(formatLaudo($row));
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/laudos/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $laudoId) {
    $stmt = $pdo->prepare('DELETE FROM laudos WHERE id = ?');
    $stmt->execute([$laudoId]);
    echo json_encode(['success' => true, 'message' => 'Laudo eliminado con éxito.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);
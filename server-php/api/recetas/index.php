<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extract optional :id from URL  e.g. /api/recetas/REC-2026-0001
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$recetaId  = ($lastPart !== 'recetas' && $lastPart !== 'index.php') ? $lastPart : null;

// Helper: format a DB row into frontend shape
function formatReceta(array $row, array $medications): array {
    return [
        'id'               => $row['id'],
        'patientId'        => $row['patient_id'],
        'patientName'      => $row['patient_name'],
        'patientIdentityCard' => $row['patient_identity_card'],
        'date'             => $row['date'],
        'clinicName'       => $row['clinic_name']       ?: null,
        'clinicSecretaria' => $row['clinic_secretaria'] ?: null,
        'clinicSistema'    => $row['clinic_sistema']    ?: null,
        'clinicAddress'    => $row['clinic_address']    ?: null,
        'clinicPhone'      => $row['clinic_phone']      ?: null,
        'clinicCnpj'       => $row['clinic_cnpj']       ?: null,
        'via1'             => (bool)$row['via1'],
        'via2'             => (bool)$row['via2'],
        'patientAddress'   => $row['patient_address']   ?: null,
        'identNome'        => $row['ident_nome']        ?: null,
        'identDoc'         => $row['ident_doc']         ?: null,
        'identAddress'     => $row['ident_address']     ?: null,
        'patientOrgEmissor' => $row['patient_org_emissor'] ?: null,
        'patientCity'      => $row['patient_city']      ?: null,
        'patientUf'        => $row['patient_uf']        ?: null,
        'observations'     => $row['observations']      ?: null,
        'medications'      => $medications,
        'createdBy'        => $row['user_name'],
    ];
}

// ------------------------------------------------------------------
// GET /api/recetas
// ------------------------------------------------------------------
if ($method === 'GET' && !$recetaId) {
    $params = $_GET;
    $where  = ['1=1'];
    $bind   = [];

    if (!empty($params['startDate'])) {
        $where[] = 'r.date >= ?';
        $bind[]  = $params['startDate'];
    }

    if (!empty($params['endDate'])) {
        $where[] = 'r.date <= ?';
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
            r.*,
            p.name AS patient_name, p.identity_card AS patient_identity_card,
            u.name AS user_name
        FROM recetas r
        JOIN patients p ON p.id = r.patient_id
        JOIN users   u ON u.id = r.user_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY r.created_at DESC
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $medications = $row['medications'] ? json_decode($row['medications'], true) : [];
        $result[]    = formatReceta($row, $medications);
    }

    echo json_encode($result);
    exit;
}

// ------------------------------------------------------------------
// POST /api/recetas
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body              = json_decode(file_get_contents('php://input'), true) ?? [];
    $patientId         = $body['patientId']         ?? '';
    $date              = !empty($body['date']) ? $body['date'] : null;
    $clinicName        = $body['clinicName']        ?? null;
    $clinicSecretaria  = $body['clinicSecretaria']  ?? null;
    $clinicSistema     = $body['clinicSistema']     ?? null;
    $clinicAddress     = $body['clinicAddress']     ?? null;
    $clinicPhone       = $body['clinicPhone']       ?? null;
    $clinicCnpj        = $body['clinicCnpj']        ?? null;
    $via1              = !empty($body['via1']) ? 1 : 0;
    $via2              = !empty($body['via2']) ? 1 : 0;
    $patientAddress    = $body['patientAddress']    ?? null;
    $identNome         = $body['identNome']         ?? null;
    $identDoc          = $body['identDoc']          ?? null;
    $identAddress      = $body['identAddress']      ?? null;
    $patientOrgEmissor = $body['patientOrgEmissor'] ?? null;
    $patientCity       = $body['patientCity']       ?? null;
    $patientUf         = $body['patientUf']         ?? null;
    $observations      = $body['observations']      ?? null;
    $medications       = $body['medications']       ?? [];

    if (!$patientId || empty($medications)) {
        http_response_code(400);
        echo json_encode(['error' => 'Campos requeridos incompletos.']);
        exit;
    }

    $pdo->beginTransaction();
    try {
        $pdo->exec("INSERT INTO receta_counter (year) VALUES (YEAR(CURDATE()))
                    ON DUPLICATE KEY UPDATE seq = seq + 1");
        $row   = $pdo->query("SELECT seq FROM receta_counter WHERE year = YEAR(CURDATE())")->fetch();
        $newId = 'REC-' . date('Y') . '-' . str_pad((int)$row['seq'], 4, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare(
            'INSERT INTO recetas (
                id, patient_id, user_id, date,
                clinic_name, clinic_secretaria, clinic_sistema, clinic_address, clinic_phone, clinic_cnpj,
                via1, via2,
                patient_address, ident_nome, ident_doc, ident_address,
                patient_org_emissor, patient_city, patient_uf,
                observations, medications
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $newId, $patientId, $userId, $date,
            $clinicName, $clinicSecretaria, $clinicSistema, $clinicAddress, $clinicPhone, $clinicCnpj,
            $via1, $via2,
            $patientAddress, $identNome, $identDoc, $identAddress,
            $patientOrgEmissor, $patientCity, $patientUf,
            $observations, json_encode($medications),
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear receta: ' . $e->getMessage()]);
        exit;
    }

    $stmt = $pdo->prepare('
        SELECT r.*, p.name AS patient_name, p.identity_card AS patient_identity_card, u.name AS user_name
        FROM recetas r
        JOIN patients p ON p.id = r.patient_id
        JOIN users   u ON u.id = r.user_id
        WHERE r.id = ?
    ');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();

    http_response_code(201);
    echo json_encode(formatReceta($row, $medications));
    exit;
}

// ------------------------------------------------------------------
// PUT /api/recetas/:id
// ------------------------------------------------------------------
if ($method === 'PUT' && $recetaId) {
    $body              = json_decode(file_get_contents('php://input'), true) ?? [];
    $date              = !empty($body['date']) ? $body['date'] : null;
    $clinicName        = $body['clinicName']        ?? null;
    $clinicSecretaria  = $body['clinicSecretaria']  ?? null;
    $clinicSistema     = $body['clinicSistema']     ?? null;
    $clinicAddress     = $body['clinicAddress']     ?? null;
    $clinicPhone       = $body['clinicPhone']       ?? null;
    $clinicCnpj        = $body['clinicCnpj']        ?? null;
    $via1              = !empty($body['via1']) ? 1 : 0;
    $via2              = !empty($body['via2']) ? 1 : 0;
    $patientAddress    = $body['patientAddress']    ?? null;
    $identNome         = $body['identNome']         ?? null;
    $identDoc          = $body['identDoc']          ?? null;
    $identAddress      = $body['identAddress']      ?? null;
    $patientOrgEmissor = $body['patientOrgEmissor'] ?? null;
    $patientCity       = $body['patientCity']       ?? null;
    $patientUf         = $body['patientUf']         ?? null;
    $observations      = $body['observations']      ?? null;
    $medications       = $body['medications']       ?? [];

    if (empty($medications)) {
        http_response_code(400);
        echo json_encode(['error' => 'Debe incluir al menos un medicamento.']);
        exit;
    }

    $upd = $pdo->prepare(
        'UPDATE recetas SET
            date=?, clinic_name=?, clinic_secretaria=?, clinic_sistema=?, clinic_address=?, clinic_phone=?, clinic_cnpj=?,
            via1=?, via2=?,
            patient_address=?, ident_nome=?, ident_doc=?, ident_address=?,
            patient_org_emissor=?, patient_city=?, patient_uf=?,
            observations=?, medications=?
         WHERE id=?'
    );
    $upd->execute([
        $date, $clinicName, $clinicSecretaria, $clinicSistema, $clinicAddress, $clinicPhone, $clinicCnpj,
        $via1, $via2,
        $patientAddress, $identNome, $identDoc, $identAddress,
        $patientOrgEmissor, $patientCity, $patientUf,
        $observations, json_encode($medications), $recetaId,
    ]);

    $stmt = $pdo->prepare('
        SELECT r.*, p.name AS patient_name, p.identity_card AS patient_identity_card, u.name AS user_name
        FROM recetas r
        JOIN patients p ON p.id = r.patient_id
        JOIN users   u ON u.id = r.user_id
        WHERE r.id = ?
    ');
    $stmt->execute([$recetaId]);
    $row = $stmt->fetch();

    echo json_encode(formatReceta($row, $medications));
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/recetas/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $recetaId) {
    $stmt = $pdo->prepare('DELETE FROM recetas WHERE id = ?');
    $stmt->execute([$recetaId]);
    echo json_encode(['success' => true, 'message' => 'Receta eliminada con éxito.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

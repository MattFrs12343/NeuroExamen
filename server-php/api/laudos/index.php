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
require_once __DIR__ . '/../../lib/laudoConclusoes.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extrae el :id opcional de la URL, ej: /api/laudos/LAU-2026-0001
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$laudoId   = ($lastPart !== 'laudos' && $lastPart !== 'index.php') ? $lastPart : null;

/**
 * Snapshot de la lista de Conclusão Pericial tal como se vio al firmar.
 *
 * Se guarda completo (JSON) y no solo el id elegido para que un laudo firmado
 * no cambie si después el médico edita o borra esa opción: el PDF es un
 * documento legal y la verificación pública descarga ese mismo PDF. Mismo
 * criterio que el snapshot del emisor (doctor/clínica).
 *
 * Acepta el array que manda el frontend o el JSON crudo (la opción elegida
 * siempre manda la lista completa). Devuelve null si no hay lista — la
 * sección no se imprime, igual que antes.
 */
function snapshotConclusaoOpcoes($opcoes): ?string {
    if (is_string($opcoes)) {
        $opcoes = json_decode($opcoes, true);
    }
    if (!is_array($opcoes) || $opcoes === []) return null;

    return json_encode(laudo_conclusoes_parse(json_encode($opcoes)), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

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
        'conclusaoOpcoes'       => laudo_conclusoes_parse($row['conclusao_opcoes'] ?? null),
        'afastamentoDias'       => $row['afastamento_dias']       !== null ? (int)$row['afastamento_dias'] : null,
        'observacoes'           => $row['observacoes'],
        'clinicName'            => $row['clinic_name']            ?: null,
        'clinicAddress'         => $row['clinic_address']         ?: null,
        'clinicPhone'           => $row['clinic_phone']           ?: null,
        'doctorName'            => $row['doctor_name']            ?: null,
        'doctorCrm'             => $row['doctor_crm']             ?: null,
        'templateId'            => $row['template_id']            ?: null,
        'tituloTipo'            => $row['titulo_tipo']             ?: 'pericial',
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
    // El INSERT escribe la tabla del catálogo y la columna del snapshot: sin la
    // migración esto sería un 500 de cuerpo vacío, sin mensaje.
    laudo_conclusoes_require_schema($pdo);

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $fields = [
        'patientId', 'patientName', 'patientIdentityCard', 'patientBirthDate', 'patientPhone',
        'orgao', 'date', 'local', 'narrative', 'cids', 'diagnostico', 'conclusao',
        'conclusaoOpcoes', 'afastamentoDias', 'observacoes', 'clinicName', 'clinicAddress', 'clinicPhone',
        'doctorName', 'doctorCrm', 'templateId', 'tituloTipo',
    ];
    $data = [];
    foreach ($fields as $f) {
        $data[$f] = $body[$f] ?? null;
    }
    $data['narrative'] = trim((string)($data['narrative'] ?? ''));
    $data['tituloTipo'] = $data['tituloTipo'] === 'medico' ? 'medico' : 'pericial';

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

    // Snapshot de la lista de conclusões — solo si se eligió alguna.
    $opcoesJson = empty($data['conclusao'])
        ? null
        : snapshotConclusaoOpcoes($data['conclusaoOpcoes'] ?? null);

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
                cids, diagnostico, conclusao, conclusao_opcoes, afastamento_dias, observacoes,
                clinic_name, clinic_address, clinic_phone,
                doctor_name, doctor_crm, template_id, titulo_tipo
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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
            $opcoesJson,
            $data['afastamentoDias'] !== null && $data['afastamentoDias'] !== '' ? (int)$data['afastamentoDias'] : null,
            $data['observacoes'],
            $data['clinicName'],
            $data['clinicAddress'],
            $data['clinicPhone'],
            $data['doctorName'],
            $data['doctorCrm'],
            $data['templateId'],
            $data['tituloTipo'],
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
    laudo_conclusoes_require_schema($pdo);

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $fields = [
        'patientId', 'patientName', 'patientIdentityCard', 'patientBirthDate', 'patientPhone',
        'orgao', 'date', 'local', 'narrative', 'cids', 'diagnostico', 'conclusao',
        'conclusaoOpcoes', 'afastamentoDias', 'observacoes', 'clinicName', 'clinicAddress', 'clinicPhone',
        'doctorName', 'doctorCrm', 'templateId', 'tituloTipo',
    ];
    $data = [];
    foreach ($fields as $f) {
        $data[$f] = $body[$f] ?? null;
    }
    $data['narrative'] = trim((string)($data['narrative'] ?? ''));
    $data['tituloTipo'] = $data['tituloTipo'] === 'medico' ? 'medico' : 'pericial';

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

    $opcoesJson = empty($data['conclusao'])
        ? null
        : snapshotConclusaoOpcoes($data['conclusaoOpcoes'] ?? null);

    $upd = $pdo->prepare(
        'UPDATE laudos SET
            patient_id=?, patient_name=?, patient_identity_card=?, patient_birth_date=?,
            patient_phone=?, orgao=?, date=?, local=?, narrative=?, cids=?, diagnostico=?,
            conclusao=?, conclusao_opcoes=?, afastamento_dias=?, observacoes=?,
            clinic_name=?, clinic_address=?, clinic_phone=?, doctor_name=?, doctor_crm=?, template_id=?,
            titulo_tipo=?
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
        $opcoesJson,
        $data['afastamentoDias'] !== null && $data['afastamentoDias'] !== '' ? (int)$data['afastamentoDias'] : null,
        $data['observacoes'],
        $data['clinicName'],
        $data['clinicAddress'],
        $data['clinicPhone'],
        $data['doctorName'],
        $data['doctorCrm'],
        $data['templateId'],
        $data['tituloTipo'],
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
<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extract optional :id from URL  e.g. /api/formula-leite/FIE-2026-0001
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$docId = ($lastPart !== 'formula-leite' && $lastPart !== 'index.php') ? $lastPart : null;

// Columnas JSON — se decodifican al leer y se codifican al escribir.
$jsonKeys = ['symptoms', 'exams', 'nutritionHistory', 'formulaTypes'];

// Helper: format a DB row into frontend shape
function formatFormulaLeite(array $row): array {
    return [
        'id'                     => $row['id'],
        'patientId'              => $row['patient_id'],
        'patientName'            => $row['patient_name'],
        'createdBy'              => $row['user_name'],
        'firstConsultDate'       => $row['first_consult_date']       ?: null,
        'patientBirthDate'       => $row['patient_birth_date']       ?: null,
        'motherName'             => $row['mother_name']              ?: null,
        'patientCns'             => $row['patient_cns']              ?: null,
        'patientPhone'           => $row['patient_phone']            ?: null,
        'professionalName'       => $row['professional_name']       ?: null,
        'institutionName'        => $row['institution_name']         ?: null,
        'cnes'                   => $row['cnes']                     ?: null,
        'solicitation'           => $row['solicitation']             ?: null,
        'quantityMonth'          => $row['quantity_month']           ?: null,
        'cid'                    => $row['cid']                      ?: null,
        'diagnostico'            => $row['diagnostico']              ?: null,
        'symptomsNotes'          => $row['symptoms_notes']           ?: null,
        'symptoms'               => $row['symptoms']         ? json_decode($row['symptoms'], true)         : [],
        'exams'                  => $row['exams']            ? json_decode($row['exams'], true)            : [],
        'weightKg'               => $row['weight_kg']                ?: null,
        'heightCm'               => $row['height_cm']                ?: null,
        'percentileBelow10'      => $row['percentile_below_10']      ?: null,
        'weightDeceleration'     => $row['weight_deceleration']      ?: null,
        'weightDecelerationTime' => $row['weight_deceleration_time'] ?: null,
        'nutritionHistory'       => $row['nutrition_history'] ? json_decode($row['nutrition_history'], true) : [],
        'footerDate'             => $row['footer_date']              ?: null,
        'doctorCns'              => $row['doctor_cns']                ?: null,
        'doctorCpf'              => $row['doctor_cpf']                 ?: null,
        'condutaOption'          => $row['conduta_option']            ?: null,
        'formulaLatas'           => $row['formula_latas']              ?: null,
        'formulaMeses'           => $row['formula_meses']               ?: null,
        'formulaTypes'           => $row['formula_types']    ? json_decode($row['formula_types'], true)    : [],
        'dataRetorno'            => $row['data_retorno']                 ?: null,
        'previsaoProvocacao'     => $row['previsao_provocacao']           ?: null,
        'avaliador'              => $row['avaliador']                     ?: null,
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
function formulaLeitePayload(array $body): array {
    global $jsonKeys;
    $keys = [
        'patientId', 'firstConsultDate', 'patientBirthDate', 'motherName', 'patientCns', 'patientPhone',
        'professionalName', 'institutionName', 'cnes', 'solicitation', 'quantityMonth',
        'cid', 'diagnostico', 'symptomsNotes', 'symptoms', 'exams',
        'weightKg', 'heightCm', 'percentileBelow10', 'weightDeceleration', 'weightDecelerationTime',
        'nutritionHistory', 'footerDate', 'doctorCns', 'doctorCpf',
        'condutaOption', 'formulaLatas', 'formulaMeses', 'formulaTypes',
        'dataRetorno', 'previsaoProvocacao', 'avaliador',
    ];
    $payload = [];
    foreach ($keys as $key) {
        $value = $body[$key] ?? (in_array($key, $jsonKeys, true) ? [] : null);
        $payload[$key] = in_array($key, $jsonKeys, true) ? json_encode($value) : $value;
    }
    foreach (['firstConsultDate', 'patientBirthDate', 'footerDate', 'dataRetorno', 'previsaoProvocacao'] as $dateKey) {
        $payload[$dateKey] = dateToIso($payload[$dateKey]);
    }
    return $payload;
}

// ------------------------------------------------------------------
// GET /api/formula-leite
// ------------------------------------------------------------------
if ($method === 'GET' && !$docId) {
    $params = $_GET;
    $where  = ['1=1'];
    $bind   = [];

    if (!empty($params['startDate'])) {
        $where[] = 'f.created_at >= ?';
        $bind[]  = $params['startDate'] . ' 00:00:00';
    }

    if (!empty($params['endDate'])) {
        $where[] = 'f.created_at <= ?';
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
            f.*,
            p.name AS patient_name,
            u.name AS user_name
        FROM formula_leite f
        JOIN patients p ON p.id = f.patient_id
        JOIN users   u ON u.id = f.user_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY f.created_at DESC
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);
    $rows = $stmt->fetchAll();

    echo json_encode(array_map('formatFormulaLeite', $rows));
    exit;
}

// ------------------------------------------------------------------
// GET /api/formula-leite/:id
// ------------------------------------------------------------------
if ($method === 'GET' && $docId) {
    $stmt = $pdo->prepare('
        SELECT f.*, p.name AS patient_name, u.name AS user_name
        FROM formula_leite f
        JOIN patients p ON p.id = f.patient_id
        JOIN users   u ON u.id = f.user_id
        WHERE f.id = ?
    ');
    $stmt->execute([$docId]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Ficha no encontrada.']);
        exit;
    }

    echo json_encode(formatFormulaLeite($row));
    exit;
}

// ------------------------------------------------------------------
// POST /api/formula-leite
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body      = json_decode(file_get_contents('php://input'), true) ?? [];
    $patientId = $body['patientId'] ?? '';

    if (!$patientId) {
        http_response_code(400);
        echo json_encode(['error' => 'Campos requeridos incompletos.']);
        exit;
    }

    $payload = formulaLeitePayload($body);

    $pdo->beginTransaction();
    try {
        $pdo->exec("INSERT INTO formula_leite_counter (year) VALUES (YEAR(CURDATE()))
                    ON DUPLICATE KEY UPDATE seq = seq + 1");
        $row   = $pdo->query("SELECT seq FROM formula_leite_counter WHERE year = YEAR(CURDATE())")->fetch();
        $newId = 'FIE-' . date('Y') . '-' . str_pad((int)$row['seq'], 4, '0', STR_PAD_LEFT);

        $stmt = $pdo->prepare(
            'INSERT INTO formula_leite (
                id, patient_id, user_id,
                first_consult_date, patient_birth_date, mother_name, patient_cns, patient_phone,
                professional_name, institution_name, cnes, solicitation, quantity_month,
                cid, diagnostico, symptoms_notes, symptoms, exams,
                weight_kg, height_cm, percentile_below_10, weight_deceleration, weight_deceleration_time,
                nutrition_history, footer_date, doctor_cns, doctor_cpf,
                conduta_option, formula_latas, formula_meses, formula_types,
                data_retorno, previsao_provocacao, avaliador
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $newId, $patientId, $userId,
            $payload['firstConsultDate'], $payload['patientBirthDate'], $payload['motherName'], $payload['patientCns'], $payload['patientPhone'],
            $payload['professionalName'], $payload['institutionName'], $payload['cnes'], $payload['solicitation'], $payload['quantityMonth'],
            $payload['cid'], $payload['diagnostico'], $payload['symptomsNotes'], $payload['symptoms'], $payload['exams'],
            $payload['weightKg'], $payload['heightCm'], $payload['percentileBelow10'], $payload['weightDeceleration'], $payload['weightDecelerationTime'],
            $payload['nutritionHistory'], $payload['footerDate'], $payload['doctorCns'], $payload['doctorCpf'],
            $payload['condutaOption'], $payload['formulaLatas'], $payload['formulaMeses'], $payload['formulaTypes'],
            $payload['dataRetorno'], $payload['previsaoProvocacao'], $payload['avaliador'],
        ]);

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al crear la ficha: ' . $e->getMessage()]);
        exit;
    }

    $stmt = $pdo->prepare('
        SELECT f.*, p.name AS patient_name, u.name AS user_name
        FROM formula_leite f
        JOIN patients p ON p.id = f.patient_id
        JOIN users   u ON u.id = f.user_id
        WHERE f.id = ?
    ');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();

    http_response_code(201);
    echo json_encode(formatFormulaLeite($row));
    exit;
}

// ------------------------------------------------------------------
// PUT /api/formula-leite/:id
// ------------------------------------------------------------------
if ($method === 'PUT' && $docId) {
    $body    = json_decode(file_get_contents('php://input'), true) ?? [];
    $payload = formulaLeitePayload($body);

    $stmt = $pdo->prepare(
        'UPDATE formula_leite SET
            first_consult_date=?, patient_birth_date=?, mother_name=?, patient_cns=?, patient_phone=?,
            professional_name=?, institution_name=?, cnes=?, solicitation=?, quantity_month=?,
            cid=?, diagnostico=?, symptoms_notes=?, symptoms=?, exams=?,
            weight_kg=?, height_cm=?, percentile_below_10=?, weight_deceleration=?, weight_deceleration_time=?,
            nutrition_history=?, footer_date=?, doctor_cns=?, doctor_cpf=?,
            conduta_option=?, formula_latas=?, formula_meses=?, formula_types=?,
            data_retorno=?, previsao_provocacao=?, avaliador=?
         WHERE id=?'
    );
    $stmt->execute([
        $payload['firstConsultDate'], $payload['patientBirthDate'], $payload['motherName'], $payload['patientCns'], $payload['patientPhone'],
        $payload['professionalName'], $payload['institutionName'], $payload['cnes'], $payload['solicitation'], $payload['quantityMonth'],
        $payload['cid'], $payload['diagnostico'], $payload['symptomsNotes'], $payload['symptoms'], $payload['exams'],
        $payload['weightKg'], $payload['heightCm'], $payload['percentileBelow10'], $payload['weightDeceleration'], $payload['weightDecelerationTime'],
        $payload['nutritionHistory'], $payload['footerDate'], $payload['doctorCns'], $payload['doctorCpf'],
        $payload['condutaOption'], $payload['formulaLatas'], $payload['formulaMeses'], $payload['formulaTypes'],
        $payload['dataRetorno'], $payload['previsaoProvocacao'], $payload['avaliador'],
        $docId,
    ]);

    $stmt = $pdo->prepare('
        SELECT f.*, p.name AS patient_name, u.name AS user_name
        FROM formula_leite f
        JOIN patients p ON p.id = f.patient_id
        JOIN users   u ON u.id = f.user_id
        WHERE f.id = ?
    ');
    $stmt->execute([$docId]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'Ficha no encontrada.']);
        exit;
    }

    echo json_encode(formatFormulaLeite($row));
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/formula-leite/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $docId) {
    $stmt = $pdo->prepare('DELETE FROM formula_leite WHERE id = ?');
    $stmt->execute([$docId]);
    echo json_encode(['success' => true, 'message' => 'Ficha eliminada con éxito.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

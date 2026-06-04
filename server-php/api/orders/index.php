<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Extract optional :id from URL  e.g. /api/orders/PED-2026-0001
$pathParts = explode('/', trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/'));
$lastPart  = end($pathParts);
$orderId   = ($lastPart !== 'orders' && $lastPart !== 'index.php') ? $lastPart : null;

// Helper: format a DB row + exams array into frontend shape
function formatOrder(array $row, array $examIds, ?array $examDescriptions, ?array $customExams): array {
    return [
        'id'               => $row['id'],
        'patientId'        => $row['patient_id'],
        'patientName'      => $row['patient_name'],
        'patientIdentityCard' => $row['patient_identity_card'],
        'date'             => $row['date'],
        'codeCID'          => $row['code_cid'],
        'clinicName'       => $row['clinic_name']   ?: null,
        'observations'     => $row['observations']  ?: null,
        'status'           => $row['status'],
        'exams'            => $examIds,
        'examDescriptions' => $examDescriptions ?: null,
        'customExams'      => $customExams      ?: null,
        'createdBy'        => $row['user_name'],
    ];
}

// Helper: fetch exam ids for an order
function getExamIds(PDO $pdo, string $orderId): array {
    $s = $pdo->prepare('SELECT exam_id FROM order_exams WHERE order_id = ?');
    $s->execute([$orderId]);
    return array_column($s->fetchAll(), 'exam_id');
}

// Helper: generate UUID v4
function uuidv4(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

// Helper: upsert exams into catalog
function upsertExams(PDO $pdo, array $examIds, array $customExamsMap): void {
    $check  = $pdo->prepare('SELECT id FROM exams WHERE id = ?');
    $insert = $pdo->prepare('INSERT IGNORE INTO exams (id, category, name) VALUES (?, ?, ?)');
    foreach ($examIds as $eid) {
        $check->execute([$eid]);
        if (!$check->fetch()) {
            $name     = $customExamsMap[$eid]['name']     ?? $eid;
            $category = $customExamsMap[$eid]['category'] ?? 'custom';
            $insert->execute([$eid, $category, $name]);
        }
    }
}

// ------------------------------------------------------------------
// GET /api/orders
// ------------------------------------------------------------------
if ($method === 'GET' && !$orderId) {
    $params = $_GET;
    $where  = ['1=1'];
    $bind   = [];

    if (!empty($params['status']) && $params['status'] !== 'Todos') {
        $where[] = 'o.status = ?';
        $bind[]  = $params['status'];
    }

    if (!empty($params['startDate'])) {
        $where[] = 'o.date >= ?';
        $bind[]  = $params['startDate'];
    }

    if (!empty($params['endDate'])) {
        $where[] = 'o.date <= ?';
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
            o.id, o.patient_id, o.user_id, o.date, o.code_cid, o.clinic_name,
            o.observations, o.status, o.custom_exams, o.exam_descriptions, o.created_at,
            p.name AS patient_name, p.identity_card AS patient_identity_card,
            u.name AS user_name
        FROM orders o
        JOIN patients p ON p.id = o.patient_id
        JOIN users   u ON u.id = o.user_id
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY o.created_at DESC
    ';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $examIds          = getExamIds($pdo, $row['id']);
        $examDescriptions = $row['exam_descriptions'] ? json_decode($row['exam_descriptions'], true) : null;
        $customExams      = $row['custom_exams']      ? json_decode($row['custom_exams'],      true) : null;
        $result[]         = formatOrder($row, $examIds, $examDescriptions, $customExams);
    }

    echo json_encode($result);
    exit;
}

// ------------------------------------------------------------------
// POST /api/orders
// ------------------------------------------------------------------
if ($method === 'POST') {
    $body            = json_decode(file_get_contents('php://input'), true) ?? [];
    $patientId       = $body['patientId']       ?? '';
    $date            = $body['date']            ?? '';
    $codeCID         = $body['codeCID']         ?? '';
    $clinicName      = $body['clinicName']      ?? null;
    $observations    = $body['observations']    ?? null;
    $status          = $body['status']          ?? 'Pendiente';
    $examIds         = $body['exams']           ?? [];
    $examDescriptions = $body['examDescriptions'] ?? null;
    $customExams     = $body['customExams']      ?? null;

    if (!$patientId || !$date || empty($examIds)) {
        http_response_code(400);
        echo json_encode(['error' => 'Campos requeridos incompletos.']);
        exit;
    }

    upsertExams($pdo, $examIds, $customExams ?? []);

    // Generate order ID: PED-YYYY-NNNN
    $year  = date('Y');
    $count = (int)$pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
    $newId = 'PED-' . $year . '-' . str_pad($count + 1, 4, '0', STR_PAD_LEFT);

    $stmt = $pdo->prepare(
        'INSERT INTO orders (id, patient_id, user_id, date, code_cid, clinic_name, observations, status, exam_descriptions, custom_exams)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $newId, $patientId, $userId, $date, $codeCID,
        $clinicName, $observations, $status,
        $examDescriptions ? json_encode($examDescriptions) : null,
        $customExams      ? json_encode($customExams)      : null,
    ]);

    // Insert pivot rows
    $pivot = $pdo->prepare('INSERT INTO order_exams (order_id, exam_id) VALUES (?, ?)');
    foreach ($examIds as $eid) {
        $pivot->execute([$newId, $eid]);
    }

    // Fetch patient + user for response
    $stmt = $pdo->prepare('
        SELECT o.*, p.name AS patient_name, p.identity_card AS patient_identity_card, u.name AS user_name
        FROM orders o
        JOIN patients p ON p.id = o.patient_id
        JOIN users   u ON u.id = o.user_id
        WHERE o.id = ?
    ');
    $stmt->execute([$newId]);
    $row = $stmt->fetch();

    http_response_code(201);
    echo json_encode(formatOrder($row, $examIds, $examDescriptions, $customExams));
    exit;
}

// ------------------------------------------------------------------
// PUT /api/orders/:id
// ------------------------------------------------------------------
if ($method === 'PUT' && $orderId) {
    $body            = json_decode(file_get_contents('php://input'), true) ?? [];
    $date            = $body['date']            ?? '';
    $codeCID         = $body['codeCID']         ?? '';
    $clinicName      = $body['clinicName']      ?? null;
    $observations    = $body['observations']    ?? null;
    $status          = $body['status']          ?? 'Pendiente';
    $examIds         = $body['exams']           ?? [];
    $examDescriptions = $body['examDescriptions'] ?? null;
    $customExams     = $body['customExams']      ?? null;

    if (empty($examIds)) {
        http_response_code(400);
        echo json_encode(['error' => 'Debe incluir al menos un examen.']);
        exit;
    }

    upsertExams($pdo, $examIds, $customExams ?? []);

    // Atomic update inside a transaction
    $pdo->beginTransaction();
    try {
        $del = $pdo->prepare('DELETE FROM order_exams WHERE order_id = ?');
        $del->execute([$orderId]);

        $upd = $pdo->prepare(
            'UPDATE orders SET date=?, code_cid=?, clinic_name=?, observations=?, status=?, exam_descriptions=?, custom_exams=? WHERE id=?'
        );
        $upd->execute([
            $date, $codeCID, $clinicName, $observations, $status,
            $examDescriptions ? json_encode($examDescriptions) : null,
            $customExams      ? json_encode($customExams)      : null,
            $orderId,
        ]);

        $pivot = $pdo->prepare('INSERT INTO order_exams (order_id, exam_id) VALUES (?, ?)');
        foreach ($examIds as $eid) {
            $pivot->execute([$orderId, $eid]);
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => 'Error al actualizar pedido: ' . $e->getMessage()]);
        exit;
    }

    $stmt = $pdo->prepare('
        SELECT o.*, p.name AS patient_name, p.identity_card AS patient_identity_card, u.name AS user_name
        FROM orders o
        JOIN patients p ON p.id = o.patient_id
        JOIN users   u ON u.id = o.user_id
        WHERE o.id = ?
    ');
    $stmt->execute([$orderId]);
    $row = $stmt->fetch();

    echo json_encode(formatOrder($row, $examIds, $examDescriptions, $customExams));
    exit;
}

// ------------------------------------------------------------------
// DELETE /api/orders/:id
// ------------------------------------------------------------------
if ($method === 'DELETE' && $orderId) {
    $stmt = $pdo->prepare('DELETE FROM orders WHERE id = ?');
    $stmt->execute([$orderId]);
    echo json_encode(['success' => true, 'message' => 'Pedido eliminado con éxito.']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Ruta no encontrada.']);

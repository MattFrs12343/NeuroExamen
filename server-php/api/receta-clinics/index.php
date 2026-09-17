<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/clinicKey.php';

setCorsHeaders();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// ------------------------------------------------------------------
// POST /api/receta-clinics  — crear (o actualizar) el perfil de una
// clínica nueva para Recetas / Atestados. Solo el nombre es obligatorio;
// el resto de los datos (secretaria/sistema/dirección/teléfono/CNPJ) son
// opcionales y son los que se imprimirán en el documento.
// ------------------------------------------------------------------
if ($method === 'POST') {
    requireAuth();

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $name = trim($body['name'] ?? '');
    $name = function_exists('mb_strtoupper') ? mb_strtoupper($name, 'UTF-8') : strtoupper($name);

    if ($name === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Debe indicar el nombre de la clínica.']);
        exit;
    }

    $fields = ['secretaria', 'sistema', 'address', 'phone', 'cnpj'];
    $values = [];
    foreach ($fields as $f) {
        $values[$f] = isset($body[$f]) ? trim((string)$body[$f]) : '';
    }

    // Los campos opcionales vacíos se guardan como NULL en la base.
    $toNull = function ($v) { return $v === '' ? null : $v; };

    $pdo     = getDB();
    $nameKey = clinic_key($name);
    $stmt    = $pdo->prepare('SELECT id, name, active FROM clinic_profiles WHERE name_key = ?');
    $stmt->execute([$nameKey]);
    $existing = $stmt->fetch();

    if ($existing) {
        // Reactivar si estaba desactivada, conservando el nombre almacenado y
        // actualizando el perfil con los datos enviados.
        $pdo->prepare('UPDATE clinic_profiles SET active = 1, has_receta_profile = 1,
              secretaria = ?, sistema = ?, address = ?, phone = ?, cnpj = ? WHERE id = ?')
            ->execute([$toNull($values['secretaria']), $toNull($values['sistema']), $toNull($values['address']), $toNull($values['phone']), $toNull($values['cnpj']), $existing['id']]);
        $clinic = ['id' => (int)$existing['id'], 'name' => $existing['name'], 'exists' => true];
    } else {
        $pdo->prepare('INSERT INTO clinic_profiles (name, name_key, active, has_receta_profile, secretaria, sistema, address, phone, cnpj) VALUES (?, ?, 1, 1, ?, ?, ?, ?, ?)')
            ->execute([$name, $nameKey, $toNull($values['secretaria']), $toNull($values['sistema']), $toNull($values['address']), $toNull($values['phone']), $toNull($values['cnpj'])]);
        $clinic = ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'exists' => false];
    }

    http_response_code(201);
    echo json_encode($clinic);
    exit;
}

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

requireAuth();

$pdo  = getDB();
$stmt = $pdo->query('SELECT id, name, secretaria, sistema, address, phone, cnpj FROM clinic_profiles WHERE active = 1 AND has_receta_profile = 1 ORDER BY name ASC');
$rows = $stmt->fetchAll();
$result = array_map(function ($row) {
    return [
        'id'         => $row['id'],
        'name'       => $row['name'],
        'secretaria' => $row['secretaria'] ?: null,
        'sistema'    => $row['sistema']    ?: null,
        'address'    => $row['address']    ?: null,
        'phone'      => $row['phone']      ?: null,
        'cnpj'       => $row['cnpj']       ?: null,
    ];
}, $rows);
echo json_encode($result);

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

    // Solo se pisan los campos que vienen en el body. Esto permite editar
    // UN campo (ej: la dirección) desde la UI sin borrar los otros datos
    // (secretaria/sistema/teléfono/CNPJ) que la clínica ya tenía guardados.
    $fields = ['secretaria', 'sistema', 'address', 'phone', 'cnpj'];
    $provided = [];
    foreach ($fields as $f) {
        if (array_key_exists($f, $body)) {
            $v = trim((string)$body[$f]);
            $provided[$f] = $v === '' ? null : $v; // vacío explícito = borrar el campo
        }
    }

    $pdo     = getDB();
    $nameKey = clinic_key($name);
    $stmt    = $pdo->prepare('SELECT id, name, active FROM clinic_profiles WHERE name_key = ?');
    $stmt->execute([$nameKey]);
    $existing = $stmt->fetch();

    if ($existing) {
        $curStmt = $pdo->prepare('SELECT secretaria, sistema, address, phone, cnpj FROM clinic_profiles WHERE id = ?');
        $curStmt->execute([$existing['id']]);
        $cur = $curStmt->fetch();

        $merged = [];
        foreach ($fields as $f) {
            $merged[$f] = array_key_exists($f, $provided) ? $provided[$f] : $cur[$f];
        }

        // Reactivar si estaba desactivada, conservando el nombre almacenado y
        // actualizando el perfil con los datos enviados (merge, no overwrite).
        $pdo->prepare('UPDATE clinic_profiles SET active = 1, has_receta_profile = 1,
              secretaria = ?, sistema = ?, address = ?, phone = ?, cnpj = ? WHERE id = ?')
            ->execute([$merged['secretaria'], $merged['sistema'], $merged['address'], $merged['phone'], $merged['cnpj'], $existing['id']]);
        $clinic = ['id' => (int)$existing['id'], 'name' => $existing['name'], 'exists' => true, 'address' => $merged['address']];
    } else {
        $ins = [];
        foreach ($fields as $f) { $ins[$f] = $provided[$f] ?? null; }
        $pdo->prepare('INSERT INTO clinic_profiles (name, name_key, active, has_receta_profile, secretaria, sistema, address, phone, cnpj) VALUES (?, ?, 1, 1, ?, ?, ?, ?, ?)')
            ->execute([$name, $nameKey, $ins['secretaria'], $ins['sistema'], $ins['address'], $ins['phone'], $ins['cnpj']]);
        $clinic = ['id' => (int)$pdo->lastInsertId(), 'name' => $name, 'exists' => false, 'address' => $ins['address']];
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

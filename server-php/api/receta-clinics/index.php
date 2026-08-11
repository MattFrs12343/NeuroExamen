<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido.']);
    exit;
}

requireAuth();

$pdo  = getDB();
$stmt = $pdo->query('SELECT id, name, secretaria, sistema, address, phone, cnpj FROM receta_clinics WHERE active = 1 ORDER BY name ASC');
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

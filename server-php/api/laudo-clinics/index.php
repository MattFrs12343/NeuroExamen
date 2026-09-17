<?php
/**
 * /api/laudo-clinics — GET (listado activo) + POST (crear/actualizar perfil).
 *
 * Devuelve TODAS las clínicas activas de la tabla única clinic_profiles
 * (con perfil de receta y/o de laudo) junto con sus datos. Si una clínica no
 * tiene perfil de laudo aún, los campos de laudo vienen null — el frontend
 * usa un fallback genérico.
 *
 * POST body:
 *   { clinicName, doctorName, doctorCrm, clinicNameFiscal,
 *     clinicAddress, clinicPhone, baseInfo, defaultNarrative,
 *     local, logo (data URI base64), primaryColor, primaryDark }
 */
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/cors.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../lib/laudoProfiles.php';

setCorsHeaders();
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// ------------------------------------------------------------------
// POST — crear o actualizar el perfil de laudo de una clínica
// ------------------------------------------------------------------
if ($method === 'POST') {
    requireAuth();

    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $clinicName = trim($body['clinicName'] ?? '');
    $clinicName = function_exists('mb_strtoupper') ? mb_strtoupper($clinicName, 'UTF-8') : strtoupper($clinicName);

    if ($clinicName === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Debe indicar el nombre de la clínica (clinicName).']);
        exit;
    }

    $fields = [
        'doctorName', 'doctorCrm', 'clinicNameFiscal',
        'clinicAddress', 'clinicPhone',
        'baseInfo', 'defaultNarrative', 'local',
        'logo', 'primaryColor', 'primaryDark',
    ];
    $data = [];
    foreach ($fields as $f) {
        $data[$f] = isset($body[$f]) ? trim((string)$body[$f]) : null;
    }

    $toNull = fn($v) => ($v === '' || $v === null) ? null : $v;

    $pdo     = getDB();
    $nameKey = clinic_key($clinicName);

    // Upsert en la tabla única. No exige que exista en el catálogo de receta:
    // una clínica puede tener SOLO perfil de laudo.
    $stmt = $pdo->prepare('SELECT id FROM clinic_profiles WHERE name_key = ?');
    $stmt->execute([$nameKey]);
    $existing = $stmt->fetch();

    if ($existing) {
        $pdo->prepare(
            'UPDATE clinic_profiles SET
                active = 1, has_laudo_profile = 1,
                doctor_name = ?, doctor_crm = ?, clinic_name_fiscal = ?,
                clinic_address = ?, clinic_phone = ?,
                base_info = ?, default_narrative = ?, local = ?,
                logo = ?, primary_color = ?, primary_dark = ?
             WHERE id = ?'
        )->execute([
            $toNull($data['doctorName']),
            $toNull($data['doctorCrm']),
            $toNull($data['clinicNameFiscal']),
            $toNull($data['clinicAddress']),
            $toNull($data['clinicPhone']),
            $toNull($data['baseInfo']),
            $toNull($data['defaultNarrative']),
            $toNull($data['local']),
            $toNull($data['logo']),
            $data['primaryColor'] ?: '#0F4C81',
            $data['primaryDark']  ?: '#0a3a63',
            $existing['id'],
        ]);
        $clinic = ['clinicName' => $clinicName, 'exists' => true];
    } else {
        $pdo->prepare(
            'INSERT INTO clinic_profiles
                (name, name_key, active, has_laudo_profile,
                 doctor_name, doctor_crm, clinic_name_fiscal,
                 clinic_address, clinic_phone,
                 base_info, default_narrative, local,
                 logo, primary_color, primary_dark)
             VALUES (?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $clinicName,
            $nameKey,
            $toNull($data['doctorName']),
            $toNull($data['doctorCrm']),
            $toNull($data['clinicNameFiscal']),
            $toNull($data['clinicAddress']),
            $toNull($data['clinicPhone']),
            $toNull($data['baseInfo']),
            $toNull($data['defaultNarrative']),
            $toNull($data['local']),
            $toNull($data['logo']),
            $data['primaryColor'] ?: '#0F4C81',
            $data['primaryDark']  ?: '#0a3a63',
        ]);
        $clinic = ['clinicName' => $clinicName, 'exists' => false];
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

$pdo = getDB();

// Trae TODAS las clínicas activas con perfil de receta O de laudo, de la
// tabla única clinic_profiles. La clínica Campinas (receta + laudo) queda en
// una sola fila y es la misma que resuelven los laudos viejos por key.
$stmt = $pdo->query('
    SELECT
        cp.name,
        cp.secretaria,
        cp.sistema,
        cp.address,
        cp.phone,
        cp.cnpj,
        cp.doctor_name,
        cp.doctor_crm,
        cp.clinic_name_fiscal,
        cp.clinic_address,
        cp.clinic_phone,
        cp.base_info,
        cp.default_narrative,
        cp.local,
        cp.logo,
        cp.primary_color,
        cp.primary_dark
    FROM clinic_profiles cp
    WHERE cp.active = 1 AND (cp.has_receta_profile = 1 OR cp.has_laudo_profile = 1)
    ORDER BY cp.name ASC
');

$rows = $stmt->fetchAll();

/**
 * Logo de la clínica como data URI base64, listo para <img src="data:...">.
 * 1) El `logo` guardado en la BD (subido desde la UI), si existe.
 * 2) Para CLINICA SAUDE CAMPINAS, si no tiene logo propio, el archivo
 *    server-php/assets/logo-saude-campinas.png (logo original en disco).
 * Otras clínicas sin logo devuelven null.
 */
$assetsDir = __DIR__ . '/../../assets/';

$logoFor = function (string $clinicName, ?string $storedLogo) use ($assetsDir): ?string {
    if ($storedLogo) return $storedLogo;
    if (laudoClinicKey($clinicName) === 'clinicasaudecampinas') {
        $file = $assetsDir . 'logo-saude-campinas.png';
        if (file_exists($file)) {
            $mime = mime_content_type($file) ?: 'image/png';
            return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($file));
        }
    }
    return null;
};

$result = array_map(function ($row) use ($logoFor) {
    return [
        'name'               => $row['name'],
        'secretaria'         => $row['secretaria']   ?: null,
        'sistema'            => $row['sistema']      ?: null,
        'address'            => $row['address']      ?: null,
        'phone'              => $row['phone']         ?: null,
        'cnpj'               => $row['cnpj']          ?: null,
        'doctorName'         => $row['doctor_name']          ?: null,
        'doctorCrm'          => $row['doctor_crm']           ?: null,
        'clinicNameFiscal'   => $row['clinic_name_fiscal']   ?: null,
        'clinicAddress'      => $row['clinic_address']       ?: null,
        'clinicPhone'        => $row['clinic_phone']         ?: null,
        'baseInfo'           => $row['base_info']            ?: null,
        'defaultNarrative'   => $row['default_narrative']    ?: null,
        'local'              => $row['local']                ?: null,
        'logo'               => $logoFor($row['name'], $row['logo'] ?: null),
        'primaryColor'       => $row['primary_color']  ?: '#0F4C81',
        'primaryDark'        => $row['primary_dark']   ?: '#0a3a63',
    ];
}, $rows);

echo json_encode($result);

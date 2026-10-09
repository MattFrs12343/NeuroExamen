<?php
/**
 * Lista las clínicas que NO tienen logo, usando la MISMA resolución que la app
 * (lib/laudoProfiles.php::getLaudoLogoDataUri), para no reportar falsos
 * positivos ni falsos negativos.
 *
 * Uso:  php scripts/diag_clinicas_sin_logo.php [ruta_api]
 * Por defecto usa la ruta de producción.
 */
$apiDir = $argv[1] ?? '/home1/matiasf6/pedidos.examenes-neuro.com/public/api';
chdir($apiDir);
require 'config/database.php';
require 'lib/clinicKey.php';
require 'lib/laudoProfiles.php';
$pdo = getDB();

// ── 1) Todas las clínicas conocidas ─────────────────────────────────────────
// De clinic_profiles (con o sin perfil de laudo) + las que aparecen en laudos.
$names = [];
try {
    foreach ($pdo->query('SELECT name, name_key, logo, active, has_laudo_profile FROM clinic_profiles ORDER BY name') as $r) {
        $names[clinic_key($r['name'])] = [
            'name'    => $r['name'],
            'key'     => $r['name_key'],
            'dbLogo'  => !empty($r['logo']),
            'active'  => (int)$r['active'] === 1,
            'perfil'  => (int)$r['has_laudo_profile'] === 1,
            'origen'  => 'clinic_profiles',
        ];
    }
} catch (Exception $e) {
    echo "Aviso: no se pudo leer clinic_profiles ({$e->getMessage()})\n";
}
foreach ($pdo->query("SELECT DISTINCT clinic_name FROM laudos WHERE clinic_name IS NOT NULL AND clinic_name <> ''") as $r) {
    $k = clinic_key($r['clinic_name']);
    if ($k === '' || isset($names[$k])) continue;
    $names[$k] = [
        'name' => $r['clinic_name'], 'key' => null, 'dbLogo' => false,
        'active' => true, 'perfil' => false, 'origen' => 'solo en laudos',
    ];
}

ksort($names);

// ── 2) Archivos de logo disponibles en assets ───────────────────────────────
$byKey = [];
foreach (glob('assets/logo-*.png') ?: [] as $file) {
    $stem = preg_replace('/^logo-/i', '', pathinfo($file, PATHINFO_FILENAME));
    $k = clinic_key($stem);
    if ($k !== '') $byKey[$k] = basename($file);
}
$aliases = laudo_logo_aliases();

$conLogo = $sinLogo = 0;
$faltan = [];
$linea = "  %-42s %-26s %-9s %s\n";

echo "\n=== TODAS LAS CLINICAS (" . count($names) . ") ===\n";
printf($linea, 'CLINICA', 'KEY / ARCHIVO', 'ORIGEN', 'ESTADO');
foreach ($names as $k => $c) {
    $uri  = getLaudoLogoDataUri($pdo, $c['name'], $c['name']);
    $file = getLaudoLogoFile($pdo, $c['name'], $c['name']);

    if ($uri !== null) {
        $conLogo++;
        $detalle = $c['dbLogo']
            ? 'logo en BD (subido desde la app)'
            : 'logo en disco: ' . ($file ? basename($file) : '?');
        if (!$c['dbLogo'] && $file && isset($aliases[$k])) {
            $detalle .= '  [via alias]';
        }
        printf($linea, $c['name'], basename((string)$file), $c['origen'], 'OK   ' . $detalle);
    } else {
        $sinLogo++;
        printf($linea, $c['name'], '-', $c['origen'], 'FALTA LOGO');
        $faltan[] = [
            'name'   => $c['name'],
            'key'    => clinic_key($c['name']),
            'origen' => $c['origen'],
            'perfil' => $c['perfil'],
        ];
    }
}

echo "\n=== RESUMEN ===\n";
echo "  con logo: $conLogo\n";
echo "  SIN logo: $sinLogo\n";

echo "\n=== CLINICAS SIN LOGO (lo que hay que resolver) ===\n";
foreach ($faltan as $i => $f) {
    echo "  " . ($i + 1) . ". " . $f['name'] . "\n";
    echo "     clave para el archivo: assets/logo-" . $f['key'] . ".png\n";
    echo "     origen: " . $f['origen'] . ($f['perfil'] ? ' (con perfil de laudo)' : ' (sin perfil de laudo)') . "\n";
}

echo "\n=== ARCHIVOS DE LOGO DISPONIBLES EN assets/ ===\n";
$usadas = [];
foreach ($names as $c) {
    $f = getLaudoLogoFile($pdo, $c['name'], $c['name']);
    if ($f) $usadas[basename($f)] = $c['name'];
}
foreach ($byKey as $k => $f) {
    echo "  " . str_pad($f, 46) . " key=" . str_pad($k, 28)
       . (isset($usadas[$f]) ? 'usada por: ' . $usadas[$f] : 'SIN USAR (huerfano)') . "\n";
}

echo "\n=== ALIASES DE LOGO ===\n";
foreach ($aliases as $from => $to) {
    echo "  $from  ->  $to  (" . (isset($byKey[$to]) ? 'existe' : 'FALTA EL ARCHIVO') . ")\n";
}

echo "\n=== CHEQUEO DE VARIANTES: nombres que podrian ser la MISMA clinica ===\n";
// Gupta del caso Campinas: el nombre fiscal "CLINICA MEDICA E ODONTOLOGICA
// N&V LTDA" no normaliza a la key de Campinas, asi que los laudos guardados con
// ese nombre salen sin membrete aunque la clinica sea la misma.
$sospechosas = [
    'clinicasaudecampinas'   => 'CLINICA SAÚDE CAMPINAS',
    'saudecampinas'          => 'archivo historico de Campinas',
    'clinicamedicaeodontologicanvltda' => 'razon social de Campinas (¿misma clinica?)',
];
foreach ($sospechosas as $k => $desc) {
    echo "  " . str_pad($k, 36) . $desc . "\n";
}
echo "  isLaudoCampinasClinic('CLINICA MEDICA E ODONTOLOGICA N&V LTDA') = "
   . (isLaudoCampinasClinic('CLINICA MEDICA E ODONTOLOGICA N&V LTDA') ? 'true' : 'false') . "\n";
echo "\n";

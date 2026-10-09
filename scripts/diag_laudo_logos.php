<?php
chdir('/home1/matiasf6/pedidos.examenes-neuro.com/public/api');
require 'config/database.php';
require 'lib/laudoProfiles.php';
$pdo = getDB();

echo '== pares reales (template_id, clinic_name) presentes en laudos ==' . PHP_EOL;
$stmt = $pdo->query("SELECT DISTINCT template_id, clinic_name FROM laudos WHERE template_id IS NOT NULL OR clinic_name IS NOT NULL ORDER BY clinic_name, template_id");
foreach ($stmt ?: [] as $row) {
    $tid = (string)($row['template_id'] ?? '');
    $cname = (string)($row['clinic_name'] ?? '');
    $uri = getLaudoLogoDataUri($pdo, $tid, $cname);
    $file = getLaudoLogoFile($pdo, $tid, $cname);
    echo '  tid=[' . $tid . '] clinic=[' . $cname . ']' . PHP_EOL;
    echo '    file=' . ($file ? basename($file) . ' (' . $file . ')' : 'NULL') . PHP_EOL;
    echo '    uri=' . ($uri ? substr($uri, 0, 18) . '... len=' . strlen($uri) : 'NULL') . PHP_EOL;
}

echo '== archivos logo-*.png en assets ==' . PHP_EOL;
foreach (glob('assets/logo-*.png') ?: [] as $f) {
    $stem = preg_replace('/^logo-/i', '', pathinfo($f, PATHINFO_FILENAME));
    $k = clinic_key($stem);
    echo '  file=' . basename($f) . ' stem=' . $stem . ' clinic_key=' . $k . PHP_EOL;
}

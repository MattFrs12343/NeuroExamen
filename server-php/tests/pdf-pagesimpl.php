<?php
$c = file_get_contents($argv[1]);

// Mapea páginas -> /Contents ids
preg_match_all('/(\d+)\s+0\s+obj\s*(<<.*?\/Type\s*\/Page.*?>>)\s*endobj/s', $c, $pm, PREG_SET_ORDER);
$plist = [];
foreach ($pm as $m) {
    $oid = $m[1];
    if (preg_match('/\/Parent\s+\d+\s+0\s+R.*?\/Contents\s+(\d+)\s+0\s+R/', $m[2], $ccm)) {
        $plist[] = [$oid, $ccm[1]];
    }
}
echo "Pages: " . count($plist) . " :: " . (count($plist) ? implode(',', array_map(fn($p) => "$p[0]->{$p[1]}", $plist)) : '') . "\n";

foreach ($plist as $p) {
    $oid = $p[0]; $sid = $p[1];
    preg_match('/' . $sid . '\s+0\s+obj\s*<<(.*?)>>\s*stream\n(.*?)\bendstream/s', $c, $m);
    if (!$m) { echo "PAGE $oid (stream $sid): not found\n"; continue; }
    $raw = $m[2];
    $dec = @gzuncompress($raw); if ($dec === false) $dec = @zlib_decode($raw);
    if ($dec === false) { echo "PAGE $oid: cannot decode\n"; continue; }
    $do = preg_match_all('/\bDo\b/', $dec);
    $imgDo = [];
    preg_match_all('/(\/[A-Za-z0-9]+)\s+Do\b/', $dec, $doM);
    foreach ($doM[1] as $x) $imgDo[] = $x;
    echo "PAGE $oid (stream $sid): len=" . strlen($dec) . " Do=$do imgs=[" . implode(',', $imgDo) . "]\n";
}
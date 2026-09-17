<?php
$c = file_get_contents($argv[1]);

function getStream($c, $id) {
    if (!preg_match('/' . $id . '\s+0\s+obj\s*<<(.*?)>>\s*stream\n(.*?)\bendstream/s', $c, $m)) {
        return null;
    }
    $dict = $m[1];
    $raw  = $m[2];
    $dec = @gzuncompress($raw);
    if ($dec === false) $dec = @gzdecode($raw);
    if ($dec === false) $dec = @zlib_decode($raw);
    return [$dict, strlen($raw), $dec];
}

foreach (explode(',', $argv[2]) as $oidS) {
    $oid = trim($oidS);
    $r = getStream($c, $oid);
    if ($r === null) { echo "obj $oid: not found\n"; continue; }
    list($dict, $rawLen, $dec) = $r;
    if ($dec === false) {
        echo "obj $oid: cannot decode (raw len=$rawLen, dict=$dict)\n";
        continue;
    }
    $do = preg_match_all('/\bDo\b/', $dec);
    $imgDo = [];
    preg_match_all('/(\/[A-Za-z0-9]+)\s+Do\b/', $dec, $doM);
    foreach ($doM[1] as $x) $imgDo[] = $x;
    $cm = preg_match_all('/\bcm\b/', $dec);
    $gs = preg_match_all('/\bgs\b/', $dec);
    $alpha = preg_match_all('/\/(ca|CA)\s+([0-9.]+)/', $dec, $am);
    echo "obj $oid: rawLen=$rawLen decLen=" . strlen($dec) . " Do=$do cm=$cm gs=$gs alpha-ops=" . json_encode(array_slice($am[2],0,6)) . " imgs=[" . implode(',', $imgDo) . "]\n";
    $pos = strpos($dec, ' Do');
    if ($pos !== false) {
        $start = max(0, $pos - 130);
        echo "   ctx: ..." . substr($dec, $start, 270) . "...\n";
    }
}
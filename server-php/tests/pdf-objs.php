<?php
$c = file_get_contents($argv[1]);
foreach (explode(',', $argv[2]) as $oidS) {
    $oid = trim($oidS);
    if (preg_match('/' . $oid . '\s+0\s+obj\s*(.*?)endobj/s', $c, $m)) {
        $blob = $m[1];
        $first = substr($blob, 0, 400);
        echo "=== OBJ $oid ===\n$first\n";
        if (preg_match('/\d+\s+0\s+R\b/', $blob)) {
            preg_match_all('/(\d+)\s+0\s+R\b/', $blob, $rm);
            echo "references: " . implode(',', $rm[1]) . "\n";
        }
        echo "\n";
    } else {
        echo "=== OBJ $oid NOT FOUND ===\n";
    }
}
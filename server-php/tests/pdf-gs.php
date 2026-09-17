<?php
$c = file_get_contents($argv[1]);
preg_match_all('/(\d+)\s+0\s+obj\s*<<(.*?ExtGState.*?)>>\s*endobj/s', $c, $m, PREG_SET_ORDER);
foreach ($m as $g) {
    echo "OBJ {$g[1]}: " . substr(preg_replace('/\s+/', ' ', $g[2]), 0, 180) . "\n";
}
// también busca /GS1 y /GS2
echo "--- GS refs ---\n";
preg_match_all('/\/GS\d+\s+(\d+)\s+0\s+R/', $c, $rm, PREG_SET_ORDER);
foreach ($rm as $rr) echo "/GS ref to obj {$rr[1]}\n";
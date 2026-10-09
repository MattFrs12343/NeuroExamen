// Analiza PNG por hoja/página: filas de píxeles NO blancos agrupadas en
// bandas de texto. Busca específicamente TINTA VISIBLE dentro de la banda del
// encabezado de continuidad (0..10mm) y reporta bandas top/bottom en mm.
// Escala: 96dpi (root) y 150dpi (pdf-raster) se derivan del ancho (210mm).
import { PNG } from 'pngjs';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'repro-out');
const rasterDir = join(outDir, 'pdf-raster');

const files = [];
for (const f of readdirSync(outDir).filter((x) => /-screen\.png$| -print\.png$/.test(x))) files.push([join(outDir, f), 96]);
for (const f of readdirSync(rasterDir).filter((x) => /\.png$/.test(x))) files.push([join(rasterDir, f), 150]);

const report = {};
for (const [file, baseDpi] of files) {
  let png;
  try {
    png = PNG.sync.read(readFileSync(file));
  } catch (err) {
    console.log(`SKIP ${file}: ${err.message}`);
    continue;
  }
  const { width, height } = png;
  const pxPerMm = width / 210; // A4 ancho
  const isInk = (r, g, b) => r < 245 || g < 245 || b < 245;
  const rowHasInk = new Array(height).fill(false);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x += 2) {
      const idx = (width * y + x) << 2;
      if (isInk(png.data[idx], png.data[idx + 1], png.data[idx + 2])) { rowHasInk[y] = true; break; }
    }
  }
  const bands = [];
  let start = -1;
  for (let y = 0; y <= height; y++) {
    const ink = y < height ? rowHasInk[y] : false;
    if (ink && start === -1) start = y;
    if (!ink && start !== -1) { bands.push([start, y - 1]); start = -1; }
  }
  const mmOf = (px) => +(px / pxPerMm).toFixed(2);
  const in10mm = bands.filter((b) => b[0] < 10 * pxPerMm && b[0] >= 0).map((b) => [mmOf(b[0]), mmOf(b[1])]);
  const around16 = bands.filter((b) => b[0] < 18 * pxPerMm && b[0] >= 11 * pxPerMm).map((b) => [mmOf(b[0]), mmOf(b[1])]);
  report[file.replace(outDir + '\\', '').replace(rasterDir + '\\', '')] = {
    dpi: baseDpi,
    mmPerPx: +(1 / pxPerMm).toFixed(4),
    heightMm: mmOf(height),
    inkInHeader0to10: in10mm,
    inkNearContentTop11to18: around16,
    bandsCount: bands.length,
    topBandMm: bands.length ? [mmOf(bands[0][0]), mmOf(bands[0][1])] : null,
    bottomBandMm: bands.length ? [mmOf(bands[bands.length - 1][0]), mmOf(bands[bands.length - 1][1])] : null,
  };
}

const out = join(outDir, 'pixel-bands.json');
writeFileSync(out, JSON.stringify(report, null, 1));
console.log(`-> ${out}`);
for (const k of Object.keys(report)) {
  const v = report[k];
  console.log(`${k.padEnd(18)} top=${JSON.stringify(v.topBandMm)} bottom=${JSON.stringify(v.bottomBandMm)} ink0-10mm=${JSON.stringify(v.inkInHeader0to10)} near11-18=${JSON.stringify(v.inkNearContentTop11to18)}`);
}
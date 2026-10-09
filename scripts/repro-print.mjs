// Driver de reproducción/medición del layout de impresión del laudo.
// Levanta Vite en un puerto alto, carga /src/dev-print.html?n=..&o=.. y mide,
// hoja por hoja: rects de texto vs banda del encabezado, cortes de línea,
// márgenes y firma. Devuelve un JSON + PNG por hoja (modo pantalla y modo
// @media print) y un PDF del pipeline real de impresión.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, '..', 'repro-out');
mkdirSync(outDir, { recursive: true });

const PORT = 5198;
const BASE = `http://127.0.0.1:${PORT}`;

const scenarios = [
  { name: 'short', n: 2, o: 1 },   // 1 hoja: firma al fondo
  { name: 'mid', n: 25, o: 1 },     // 2 hojas
  { name: 'long', n: 40, o: 10 },   // 4 hojas (caso ELAINE)
  { name: 'xl', n: 80, o: 20 },     // muchas hojas
];

// ── Levantar Vite ───────────────────────────────────────────────────────────
const vite = spawn('npx vite --port ' + String(PORT) + ' --strictPort --host 127.0.0.1', [], {
  cwd: root,
  shell: true,
  stdio: 'ignore',
});

for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(BASE);
    if (r.ok) break;
  } catch { /* noop */ }
  await new Promise((r) => setTimeout(r, 500));
  if (i === 59) {
    console.error('Vite no arrancó');
    vite.kill();
    process.exit(1);
  }
}

// ── Medidas por hoja ────────────────────────────────────────────────────────
// Se evalúa dentro del navegador. `ariaHidden(true)` excluye encabezado y
// marca de agua; el pie se mide aparte. Todos los valores en px, relativos al
// top de su hoja. Los rects de get*Rects() son cajas de layout REALES (no
// recortadas), que es exactamente lo que hay que auditar: si una línea cae en
// la banda del encabezado o cruza el borde de la ventana, hay colisión/corte.
const measureAll = () => {
  const area = document.querySelector('.print-area-laudo');
  const sheets = Array.from(area.children);
  return sheets.map((sheet, i) => {
    const s = sheet.getBoundingClientRect();
    const textRects = (rootEl, excludeHidden) => {
      const out = [];
      const insideHidden = (el) => {
        while (el) {
          if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return true;
          el = el.parentElement;
        }
        return false;
      };
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p || !p.textContent || !p.textContent.trim()) return NodeFilter.FILTER_REJECT;
          if (excludeHidden && insideHidden(p)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const range = document.createRange();
      let n;
      while ((n = walker.nextNode())) {
        range.selectNodeContents(n);
        for (const r of Array.from(range.getClientRects())) {
          if (r.height <= 0.5 && r.width <= 0.5) continue;
          out.push({ top: r.top - s.top, bottom: r.bottom - s.top });
        }
      }
      range.detach();
      return out;
    };
    // Encabezado de continuidad (banda 0-10mm, páginas 2+)
    const header = Array.from(sheet.children).find(
      (c) => c.getAttribute && c.getAttribute('aria-hidden') === 'true' && /P.gina/.test(c.textContent),
    );
    // Ventana de contenido = el flex:1 que recorta cada tramo (robusto)
    const kids = Array.from(sheet.children);
    let win = kids.find((c) => getComputedStyle(c).flexGrow === '1');
    if (!win) win = kids.find((c) => /\bflex\s*:\s*1\b/.test(c.getAttribute('style') || ''));
    const w = win ? win.getBoundingClientRect() : null;

    const allWindowLines = win ? textRects(win, true) : [];
    // Solo líneas VISIBLES (su caja intersecta la ventana de la hoja) y las
    // recortadas por el borde superior (cruzan winTop) — señal de desalineo.
    const visible = allWindowLines.filter((l) => l.bottom > (w ? w.top - s.top : 0) && l.top < (w ? w.bottom - s.top : 0));
    const inHeaderBBox = allWindowLines.filter((l) => l.bottom > 0 && l.top < 10 * 3.7795);
    const visibleInHeader = inHeaderBBox.filter((l) => l.bottom > (w ? w.top - s.top : 0));
    const cutTop = visible.filter((l) => l.top < 3.7795 * 16 - 1); // primera línea encima del top esperado
    const clippedFirstLine = allWindowLines.filter((l) => l.top < (w ? w.top - s.top : 0) && l.bottom > (w ? w.top - s.top : 0));

    return {
      page: i + 1,
      headerTopMm: header ? +((header.getBoundingClientRect().top - s.top) / 3.7795).toFixed(2) : null,
      headerBottomMm: header ? +((header.getBoundingClientRect().bottom - s.top) / 3.7795).toFixed(2) : null,
      // Margen lateral del encabezado de continuidad (esperado: 18 = SIDE_MM).
      // Con left:0 caía en la padding-box de la hoja y el nombre salía pegado
      // al borde físico del papel.
      headerLeftMm: header ? +((header.getBoundingClientRect().left - s.left) / 3.7795).toFixed(2) : null,
      headerRightMm: header ? +((s.right - header.getBoundingClientRect().right) / 3.7795).toFixed(2) : null,
      winTopMm: w ? +((w.top - s.top) / 3.7795).toFixed(2) : null,
      winBottomMm: w ? +((w.bottom - s.top) / 3.7795).toFixed(2) : null,
      lineBBoxCount: allWindowLines.length,
      visibleLineCount: visible.length,
      minVisibleTopMm: visible.length ? +(Math.min(...visible.map((l) => l.top)) / 3.7795).toFixed(2) : null,
      maxVisibleBottomMm: visible.length ? +(Math.max(...visible.map((l) => l.bottom)) / 3.7795).toFixed(2) : null,
      inHeaderBBoxCount: inHeaderBBox.length,
      visibleInHeaderCount: visibleInHeader.length,
      cutTopCount: cutTop.length,
      clippedFirstLineCount: clippedFirstLine.length,
      headerGapMm: (() => {
        const m = Math.min(...visible.map((l) => l.top));
        return w ? +((w.top - s.top) - m) / 3.7795 : null;
      })(),
    };
  });
};

// ── Esperar hojas estables ──────────────────────────────────────────────────
async function stableSheets(page) {
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 60; i++) {
    const count = await page.locator('.print-area-laudo > div').count();
    if (count === last) {
      if (count >= 1 && ++stable >= 3) return count;
    } else {
      stable = 0;
      last = count;
    }
    await page.waitForTimeout(100);
  }
  return last;
}

const browser = await chromium.launch();
const report = [];

try {
  for (const sc of scenarios) {
    const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
    console.log(`[${sc.name}] abriendo n=${sc.n} o=${sc.o}`);
    await page.goto(`${BASE}/src/dev-print.html?n=${sc.n}&o=${sc.o}`, { waitUntil: 'networkidle' });
    const sheets = await stableSheets(page);
    console.log(`[${sc.name}] hojas=${sheets}`);

    const screenRows = await page.evaluate(measureAll);
    console.log(`[${sc.name}] medidas screen listas`);

    // PNG por hoja en modo pantalla
    for (let i = 0; i < screenRows.length; i++) {
      try {
        await page
          .locator('.print-area-laudo > div')
          .nth(i)
          .screenshot({ path: join(outDir, `${sc.name}-p${i + 1}-screen.png`) });
      } catch (err) {
        console.log(`[${sc.name}] screen p${i + 1} skip: ${String(err).split('\n')[0]}`);
      }
    }

    // Modo @media print: medidas + PNG por hoja (scrollIntoView + clip; el
    // screenshot de elemento se cuelga en media print)
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);
    const printRows = await page.evaluate(measureAll);
    console.log(`[${sc.name}] medidas print listas`);
    for (let i = 0; i < printRows.length; i++) {
      try {
        const sel = `.print-area-laudo > div:nth-child(${i + 1})`;
        await page.evaluate((s) => {
          const el = document.querySelector(s);
          if (el) el.scrollIntoView({ block: 'start' });
        }, sel);
        await page.waitForTimeout(100);
        const box = await page.locator(sel).boundingBox();
        if (box) {
          await page.screenshot({
            path: join(outDir, `${sc.name}-p${i + 1}-print.png`),
            clip: { x: Math.floor(box.x), y: 0, width: Math.ceil(box.width), height: Math.ceil(box.height) },
            captureBeyondViewport: false,
          });
        }
      } catch (err) {
        console.log(`[${sc.name}] print p${i + 1} skip: ${String(err).split('\n')[0]}`);
      }
    }

    // PDF del pipeline real de impresión: reseteando media primero (emulate
    // media + page.pdf devuelve un PDF vacío — bug conocido de Playwright)
    try {
      await page.emulateMedia({ media: 'screen' });
      const pdfPath = join(outDir, `${sc.name}.pdf`);
      await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true, format: 'A4' });
    } catch (err) {
      console.log(`[${sc.name}] pdf skip: ${String(err).split('\n')[0]}`);
    }

    report.push({ scenario: sc.name, n: sc.n, o: sc.o, sheets, screen: screenRows, print: printRows });
    console.log(`[${sc.name}] listo (${screenRows.length} hojas)`);
    await page.close();
  }
} finally {
  vite.kill();
  await browser.close();
}

writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(`report -> ${join(outDir, 'report.json')}`);
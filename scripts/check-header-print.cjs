// Verificación directa del encabezado de continuidad en modo @media print:
// rects de la hoja 2, del encabezado y de la 1ª línea de texto del cuerpo,
// más un screenshot anclado al borde real de la hoja.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const { join } = require('node:path');

const root = join(__dirname, '..');
const outDir = join(root, 'repro-out');
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;

(async () => {
  const vite = spawn('npx vite --port ' + String(PORT) + ' --strictPort --host 127.0.0.1', [], {
    cwd: root, shell: true, stdio: 'ignore',
  });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE); if (r.ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 500));
    if (i === 59) throw new Error('vite no levantó');
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
    await page.goto(`${BASE}/src/dev-print.html?n=25&o=1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(300);

    const rows = await page.evaluate(() => {
      const sheets = Array.from(document.querySelectorAll('.print-area-laudo > div'));
      const MM = 96 / 25.4;
      return sheets.map((s, i) => {
        const sr = s.getBoundingClientRect();
        const header = Array.from(s.children).find(
          (c) => c.getAttribute && c.getAttribute('aria-hidden') === 'true' && /P.gina/.test(c.textContent),
        );
        const hr = header ? header.getBoundingClientRect() : null;
        const win = Array.from(s.children).find((c) => getComputedStyle(c).flexGrow === '1');
        const wr = win ? win.getBoundingClientRect() : null;
        // 1ª caja de línea de texto visible en la ventana (cuerpo)
        let firstTextTopMm = null;
        let firstTextLeftMm = null;
        if (wr) {
          const walker = document.createTreeWalker(win, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = walker.nextNode())) {
            if (!n.textContent.trim()) continue;
            const r = document.createRange();
            r.selectNodeContents(n);
            const rect = r.getBoundingClientRect();
            if (rect.height <= 0.5 || rect.width <= 0.5) continue;
            if (rect.top < wr.top) continue; // recortada por el borde superior
            firstTextTopMm = +((rect.top - sr.top) / MM).toFixed(2);
            firstTextLeftMm = +((rect.left - sr.left) / MM).toFixed(2);
            break;
          }
        }
        return {
          page: i + 1,
          sheet: { top: +sr.top.toFixed(1), left: +sr.left.toFixed(1), w: +sr.width.toFixed(1), h: +sr.height.toFixed(1) },
          header: hr
            ? {
                leftMm: +((hr.left - sr.left) / MM).toFixed(2),
                rightMm: +((sr.right - hr.right) / MM).toFixed(2),
                topMm: +((hr.top - sr.top) / MM).toFixed(2),
                bottomMm: +((hr.bottom - sr.top) / MM).toFixed(2),
                textLeftMm: (() => {
                  const r = document.createRange();
                  r.selectNodeContents(header);
                  const b = r.getBoundingClientRect();
                  return +((b.left - sr.left) / MM).toFixed(2);
                })(),
              }
            : null,
          firstTextTopMm,
          firstTextLeftMm,
        };
      });
    });
    console.log(JSON.stringify(rows, null, 2));

    // screenshot anclado al borde REAL de la hoja 2 (clip en coords de página)
    const sheet2 = page.locator('.print-area-laudo > div').nth(1);
    const box = await sheet2.boundingBox();
    if (box) {
      await page.evaluate(() => {
        const el = document.querySelectorAll('.print-area-laudo > div')[1];
        if (el) el.scrollIntoView({ block: 'start' });
      });
      await page.waitForTimeout(200);
      const box2 = await sheet2.boundingBox();
      await page.screenshot({
        path: join(outDir, 'check-hdr-print-p2.png'),
        clip: { x: Math.floor(box2.x), y: Math.floor(box2.y), width: Math.ceil(box2.width), height: Math.ceil(box2.height) },
        captureBeyondViewport: false,
      });
      console.log('box1', JSON.stringify(box), 'box2', JSON.stringify(box2));
    }
  } finally {
    await browser.close();
    vite.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });

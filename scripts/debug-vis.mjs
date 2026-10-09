import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const root = 'C:/Users/Usuario/Downloads/NeuroExamen';
const PORT = 5198;
const BASE = `http://127.0.0.1:${PORT}`;

const vite = spawn('npx vite --port ' + PORT + ' --strictPort --host 127.0.0.1', [], {
  cwd: root, shell: true, stdio: 'ignore',
});
for (let i = 0; i < 60; i++) {
  try { const r = await fetch(BASE); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
  await page.goto(`${BASE}/src/dev-print.html?n=40&o=10`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const area = document.querySelector('.print-area-laudo');
    const sheet = area ? area.firstElementChild : null;
    return {
      bodyClass: document.body.className,
      areaDisplay: area ? getComputedStyle(area).display : null,
      sheetDisplay: sheet ? getComputedStyle(sheet).display : null,
      sheetCount: area ? area.children.length : 0,
      sheetRect: sheet ? (() => { const r = sheet.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })() : null,
    };
  });
  console.log('SCREEN:', JSON.stringify(info));
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(500);
  const info2 = await page.evaluate(() => {
    const area = document.querySelector('.print-area-laudo');
    const sheet = area ? area.firstElementChild : null;
    return {
      areaDisplay: area ? getComputedStyle(area).display : null,
      sheetDisplay: sheet ? getComputedStyle(sheet).display : null,
      sheetOffParent: sheet ? sheet.offsetParent?.tagName : null,
      sheetCount: area ? area.children.length : 0,
    };
  });
  console.log('PRINT :', JSON.stringify(info2));
} finally {
  vite.kill();
  await browser.close();
}
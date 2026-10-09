// Verifica en Chromium real que el modal de narrativa extendida (NewLaudo)
// cabe en la ventana y se puede desplazar hasta el final del texto.
// Monta src/dev-modal.html (NewLaudo con contexto mockeado y narrativa larga),
// abre el modal desde la caja de la narrativa y mide geometría + scroll real.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 5199;
const OUT = join(process.cwd(), 'repro-out', 'modal');
mkdirSync(OUT, { recursive: true });

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  shell: true,
  stdio: 'ignore',
});
const cleanup = () => { try { vite.kill(); } catch { /* ya muerto */ } };
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let up = false;
for (let i = 0; i < 80; i++) {
  try {
    const r = await fetch(`http://localhost:${PORT}/`);
    if (r.ok) { up = true; break; }
  } catch { /* aun no levanta */ }
  await wait(500);
}
if (!up) { console.log('ERROR: vite no levanto'); cleanup(); process.exit(1); }

const browser = await chromium.launch();

const VIEWPORTS = [
  { label: 'desktop-800', width: 1280, height: 800 },
  { label: 'notebook-600', width: 1280, height: 600 },
  { label: 'pantalla-alta-1080', width: 1440, height: 1080 },
];

let fallos = 0;
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/src/dev-modal.html`, { waitUntil: 'load' });
  await page.waitForSelector('.max-w-3xl, [role="button"]', { timeout: 20000 });
  await wait(600);

  // Abre el modal desde la caja de la narrativa (role=button que envuelve la
  // vista previa del texto).
  const abierto = await page.evaluate(() => {
    const cajas = Array.from(document.querySelectorAll('div[role="button"]'));
    const caja = cajas.find((c) => (c.textContent || '').length > 200);
    if (!caja) return false;
    caja.click();
    return true;
  });
  if (!abierto) { console.log(`[${vp.label}] NO se pudo abrir el modal`); fallos++; await ctx.close(); continue; }
  await page.waitForSelector('[data-placeholder]', { timeout: 10000 });
  await wait(400);

  const m = await page.evaluate(() => {
    const editor = document.querySelector('[data-placeholder]');
    const card = document.querySelector('.max-w-3xl');
    const body = editor?.closest('.overflow-y-auto');
    const header = card?.querySelector('div.border-b');
    const r = (el) => { const b = el.getBoundingClientRect(); return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), h: +b.height.toFixed(1) }; };
    return {
      vh: window.innerHeight,
      card: card ? r(card) : null,
      header: header ? r(header) : null,
      body: body ? r(body) : null,
      bodyScrollable: body ? body.scrollHeight > body.clientHeight + 1 : null,
      editorScrollH: editor?.scrollHeight ?? null,
      editorClientH: editor?.clientHeight ?? null,
      editorScrollable: editor ? editor.scrollHeight > editor.clientHeight + 1 : null,
      editorMaxH: editor ? getComputedStyle(editor).maxHeight : null,
      editorOverflowY: editor ? getComputedStyle(editor).overflowY : null,
    };
  });

  // ¿Se puede desplazar hasta el FINAL y ver el último texto?
  const scrolled = await page.evaluate(() => {
    const editor = document.querySelector('[data-placeholder]');
    if (!editor) return null;
    editor.scrollTop = editor.scrollHeight;
    return { scrollTop: editor.scrollTop, maxScroll: editor.scrollHeight - editor.clientHeight };
  });
  await wait(250);
  const ultimaLineaVisible = await page.evaluate(() => {
    const editor = document.querySelector('[data-placeholder]');
    if (!editor) return null;
    const b = editor.getBoundingClientRect();
    return b.top >= -1 && b.bottom <= window.innerHeight + 1;
  });
  await page.screenshot({ path: join(OUT, `modal-${vp.label}.png`) });

  const cabe = m.card ? m.card.h <= m.vh : false;
  const dentro = m.card ? m.card.top >= -1 : false;
  const ok = cabe && dentro && m.editorScrollable === true && scrolled.maxScroll > 0;
  if (!ok) fallos++;

  console.log(`[${vp.label}] vh=${m.vh} card=${JSON.stringify(m.card)} header=${JSON.stringify(m.header)}`);
  console.log(`   editor maxH=${m.editorMaxH} overflowY=${m.editorOverflowY} scrollH=${m.editorScrollH} clientH=${m.editorClientH} desplazable=${m.editorScrollable}`);
  console.log(`   body desplazable=${m.bodyScrollable} scrollFinal=${JSON.stringify(scrolled)} editorCompletoVisible=${ultimaLineaVisible}`);
  console.log(`   => ${ok ? 'OK' : 'FALLA'} (cabe=${cabe} dentroDeVentana=${dentro})`);

  await ctx.close();
}

await browser.close();
cleanup();
console.log(fallos === 0 ? 'TODO OK' : `FALLOS: ${fallos}`);
process.exit(fallos === 0 ? 0 : 1);

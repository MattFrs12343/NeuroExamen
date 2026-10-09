// Rasteriza los PDFs de impresión (pipeline real de Chromium) a PNG por
// página, para inspección de píxeles. Escala 2x (~150dpi).
import { createCanvas } from '@napi-rs/canvas';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'repro-out');
mkdirSync(join(outDir, 'pdf-raster'), { recursive: true });

const pdfs = readdirSync(outDir).filter((f) => /\.pdf$/.test(f));
const scale = 2;

for (const pdfName of pdfs) {
  const data = new Uint8Array(readFileSync(join(outDir, pdfName)));
  const doc = await pdfjs.getDocument({ data }).promise;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const base = pdfName.replace('.pdf', '');
    writeFileSync(join(outDir, 'pdf-raster', `${base}-pg${i}.png`), canvas.toBuffer('image/png'));
    console.log(`${base}-pg${i}.png ${Math.ceil(vp.width)}x${Math.ceil(vp.height)}`);
  }
}
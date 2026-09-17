import React, { useMemo } from 'react';
import { encodeQr } from '../lib/qrcode';

interface QrCodeGridProps {
  value: string;
  size: number; // px, rendered square
  dark?: string;
  light?: string;
}

/**
 * QR dibujado como una grilla de <div> lisos (sin <img>/<svg>) — html2canvas
 * viene fallando en silencio al capturar tanto el <svg> original (QrCodeSvg)
 * como un <img src="data:..."> rasterizado (QrCodeImg): en ambos casos su
 * pipeline de carga/reconstrucción de imágenes no terminaba de resolver a
 * tiempo. Cajas de color posicionadas son literalmente lo que html2canvas
 * mejor sabe capturar (conversión DOM→canvas, sin decodificar nada), así que
 * es la opción más a prueba de fallos para la plantilla de captura.
 *
 * Un <div> por módulo (hasta ~1000 para un QR de este tamaño de contenido)
 * multiplicado por página —el QR va en CADA página de un Pedido— era lo que
 * volvía lenta la captura. Acá se fusionan los módulos oscuros contiguos de
 * cada fila en un solo <div> más ancho (mismo píxel pintado, muchos menos
 * nodos), sin cambiar en nada el dibujo final.
 */
export const QrCodeGrid: React.FC<QrCodeGridProps> = ({ value, size, dark = '#000000', light = '#FFFFFF' }) => {
  const matrix = useMemo(() => encodeQr(value, 'M'), [value]);
  const quiet = 2;
  const total = matrix.size + quiet * 2;
  const cellPx = size / total;
  const cellSizePx = Math.ceil(cellPx) + 0.5;

  const runs = useMemo(() => {
    const result: { x: number; y: number; len: number }[] = [];
    for (let y = 0; y < matrix.size; y++) {
      let runStart = -1;
      for (let x = 0; x <= matrix.size; x++) {
        const on = x < matrix.size && matrix.modules[y][x];
        if (on && runStart === -1) runStart = x;
        if (!on && runStart !== -1) {
          result.push({ x: runStart, y, len: x - runStart });
          runStart = -1;
        }
      }
    }
    return result;
  }, [matrix]);

  return (
    <div style={{ position: 'relative', width: size, height: size, backgroundColor: light }}>
      {runs.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: (r.x + quiet) * cellPx,
            top: (r.y + quiet) * cellPx,
            width: r.len * cellPx + 0.5,
            height: cellSizePx,
            backgroundColor: dark,
          }}
        />
      ))}
    </div>
  );
};

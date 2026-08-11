import React, { useMemo } from 'react';
import { encodeQr } from '../lib/qrcode';

interface QrCodeSvgProps {
  value: string;
  size: number; // px, rendered square
  dark?: string;
  light?: string;
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({ value, size, dark = '#000000', light = '#FFFFFF' }) => {
  const matrix = useMemo(() => encodeQr(value, 'M'), [value]);
  const quiet = 2; // quiet-zone modules around the code
  const total = matrix.size + quiet * 2;

  const path = useMemo(() => {
    let d = '';
    for (let y = 0; y < matrix.size; y++) {
      for (let x = 0; x < matrix.size; x++) {
        if (matrix.modules[y][x]) d += `M${x + quiet},${y + quiet}h1v1h-1z`;
      }
    }
    return d;
  }, [matrix]);

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      style={{ display: 'block' }}
    >
      <rect x={0} y={0} width={total} height={total} fill={light} />
      <path d={path} fill={dark} />
    </svg>
  );
};

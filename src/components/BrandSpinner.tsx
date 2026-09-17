import React from 'react';
import cerebroLogo from '../assets/cerebro.png';
import { cn } from '../lib/utils';

interface BrandSpinnerProps {
  size?: number;        // px del cuadrado total
  ringWidth?: number;   // px del borde del anillo
  className?: string;
}

// Spinner de marca: anillo giratorio con el logotipo del cerebro estático en
// el centro. Reemplaza al spinner circular genérico en toda la plataforma
// (fallback de vistas lazy, carga inicial de datos).
export const BrandSpinner: React.FC<BrandSpinnerProps> = ({
  size = 56,
  ringWidth = 3,
  className,
}) => {
  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Cargando"
    >
      <div
        className="absolute inset-0 rounded-full animate-spin"
        style={{
          borderWidth: ringWidth,
          borderStyle: 'solid',
          borderColor: 'rgb(226 232 240)',              // slate-200
          borderTopColor: '#0F4C81',                    // acento institucional
        }}
      />
      <img
        src={cerebroLogo}
        alt="NeuroExámenes"
        className="object-contain select-none"
        style={{ width: size * 0.5, height: size * 0.5 }}
        draggable={false}
      />
    </div>
  );
};
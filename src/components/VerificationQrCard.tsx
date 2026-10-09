import React from 'react';
import { QrCodeGrid } from './QrCodeGrid';
import { DOCTOR_CRM } from '../lib/doctor';

interface VerificationQrCardProps {
  qrContent: string;
  token: string;
  // Código de acesso de 4 dígitos del documento (access_code) — el mismo que
  // se envía por WhatsApp. Se imprime bajo el QR para que quien reciba el
  // papel sin el WhatsApp pueda igual acceder a la vista del documento en la
  // página de verificación. Opcional: si no se pasa, no se pinta la línea
  // (las plantillas que no tengan el código a mano no cambian).
  accessCode?: string;
  // 'compact' (Recetas): la receta crece con el texto de la prescripción y
  // no pagina — un QR del mismo tamaño que Pedidos empujaba demasiado la
  // firma hacia abajo en recetas largas. 'mini' (Receituário): el QR va
  // suelto en el pie, sin ningún bloque de texto al lado que le dé contexto
  // de tamaño, así que pide uno más chico todavía. Cada sección pide su
  // propio tamaño explícitamente (nunca un default compartido) para que
  // ajustar uno no mueva el otro.
  size: 'default' | 'compact' | 'mini';
  // Color de los módulos del QR — por defecto negro (mejor contraste posible
  // para escanear). Encaminhamentos NeuroMóbius pide un morado pastel acá
  // (ver PrintEncaminhamentoTemplate.tsx) para que el QR de verificación
  // combine con el resto de la plantilla, no el gris/negro genérico.
  dark?: string;
  // Fondo y borde del recuadro — por defecto el celeste genérico. NeuroMóbius
  // pide su propia superficie pastel (printSurface/printSurfaceBorder) para
  // que el recuadro entero, no solo el QR, combine con la plantilla.
  surface?: string;
  surfaceBorder?: string;
  // Color del título/código — por defecto el azul genérico (#0F4C81).
  accent?: string;
}

const SIZES = {
  default: { card: 168, qr: 132, pad: '10px 12px', title: '8px', subtitle: '6.5px', code: '7.5px', gapTitle: '4px', gapSub: '7px', gapCode: '7px' },
  compact: { card: 118, qr: 88, pad: '7px 9px', title: '6.5px', subtitle: '5.5px', code: '6.5px', gapTitle: '3px', gapSub: '5px', gapCode: '5px' },
  mini: { card: 92, qr: 68, pad: '6px 7px', title: '5.5px', subtitle: '4.8px', code: '5.5px', gapTitle: '2.5px', gapSub: '4px', gapCode: '4px' },
} as const;

/**
 * Tarjeta de verificación para las plantillas de captura (Pedidos/Recetas) —
 * mismo estilo que drawQrVerificationBox() en server-php/lib/signing.php
 * (usado por Atestados/Encaminhamentos/Fórmulas Infantis): QR negro, marco
 * celeste claro, título + subtítulo + código. Se mantiene igual acá para que
 * los cinco tipos de documento luzcan consistentes.
 */
export const VerificationQrCard: React.FC<VerificationQrCardProps> = ({
  qrContent, token, accessCode, size, dark = '#000000', surface = '#F7FAFC', surfaceBorder = '#CBD5E1', accent = '#0F4C81',
}) => {
  const s = SIZES[size];
  return (
    <div style={{
      textAlign: 'center',
      border: `1px solid ${surfaceBorder}`,
      borderRadius: '6px',
      backgroundColor: surface,
      padding: s.pad,
      width: `${s.card}px`,
      boxSizing: 'border-box',
    }}>
      <p style={{ margin: `0 0 ${s.gapTitle} 0`, fontSize: s.title, fontWeight: 700, color: accent, lineHeight: 1.3 }}>
        Documento emitido por Juan Marcelo Cabello Merida ({DOCTOR_CRM})
      </p>
      <p style={{ margin: `0 0 ${s.gapSub} 0`, fontSize: s.subtitle, color: '#64748B', lineHeight: 1.3 }}>
        Verifique a assinatura digital
      </p>
      <div style={{ display: 'inline-block' }}>
        <QrCodeGrid value={qrContent} size={s.qr} dark={dark} light="#FFFFFF" />
      </div>
      <p style={{ margin: `${s.gapCode} 0 0 0`, fontSize: s.code, fontWeight: 700, color: accent }}>
        Código: {token}
      </p>
      {accessCode && (
        <p style={{ margin: `0 0 0 0`, fontSize: s.code, fontWeight: 700, color: accent }}>
          Código de acesso: {accessCode}
        </p>
      )}
    </div>
  );
};

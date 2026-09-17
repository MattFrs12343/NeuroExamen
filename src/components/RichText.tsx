import * as React from 'react';
import { richTextToHtml } from '../lib/richText';

// ── Renderizador de texto enriquecido ───────────────────────────────────────
// Convierte el valor guardado (HTML con <b>/<u>/<br>, o texto plano legado) al
// HTML seguro que se muestra en pantalla, en las plantillas de impresión y en
// las vistas de detalle. No usar nunca con HTML sin pasar por richTextToHtml.

export interface RichTextProps {
  html?: string | null;
  className?: string;
  style?: React.CSSProperties;
  tag?: 'div' | 'p' | 'span';
}

export const RichText: React.FC<RichTextProps> = ({ html, className, style, tag = 'div' }) => {
  const Tag = tag;
  return (
    <Tag
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: richTextToHtml(html) }}
    />
  );
};

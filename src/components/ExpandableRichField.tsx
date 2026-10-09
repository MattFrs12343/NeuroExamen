import * as React from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { RichTextField } from './ui/rich-text-field';
import { RichText } from './RichText';
import { cn } from '../lib/utils';
import { isRichTextEmpty } from '../lib/richText';

// ── Campo de texto libre expandible a modal ──────────────────────────────────
// En el formulario muestra una VISTA PREVIA con el formato real (negrita,
// subrayado, saltos de línea) como en el PDF; al hacer clic en la caja (o en
// el botón de maximizar) se abre un modal grande con el editor de texto
// enriquecido (barra B/U). Mismo patrón que la narrativa del laudo: la
// escritura es "en vivo" (el valor se emite con change mientras se teclea;
// el modal solo se cierra).

export interface ExpandableRichFieldProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Clases de la caja de vista previa (borde, fondo, etc.). */
  className?: string;
  /** Estilos de la caja de vista previa (minHeight, fontSize...). */
  style?: React.CSSProperties;
  /** Título del header del modal. */
  modalTitle?: string;
  /** Subtítulo pequeño del header del modal (opcional). */
  modalSubtitle?: string;
  /** Etiqueta accesible del botón de maximizar. */
  expandLabel?: string;
  /** Etiqueta accesible del botón de cerrar. */
  closeLabel?: string;
}

export const ExpandableRichField: React.FC<ExpandableRichFieldProps> = ({
  value,
  onChange,
  placeholder = '',
  className,
  style,
  modalTitle,
  modalSubtitle,
  expandLabel = 'Ampliar',
  closeLabel = 'Cerrar',
}) => {
  const [open, setOpen] = React.useState(false);
  const empty = isRichTextEmpty(value);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  // Escape cierra el modal; mientras está abierto se bloquea el scroll del fondo.
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <div className="relative group">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={openModal}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openModal();
            }
          }}
          className={cn(
            'w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50',
            'hover:border-[#0F4C81] transition-colors px-3 py-2.5',
            'text-sm text-slate-700 leading-relaxed whitespace-pre-wrap',
            className,
          )}
          style={style}
        >
          {empty
            ? <span className="text-slate-400">{placeholder}</span>
            : <RichText html={value} />}
        </div>
        <button
          type="button"
          title={expandLabel}
          aria-label={expandLabel}
          onClick={e => { e.stopPropagation(); openModal(); }}
          className="absolute right-2 bottom-2 p-1.5 rounded-lg text-slate-400 bg-white/80 hover:text-[#0F4C81] hover:bg-slate-100 transition-colors"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm animate-fade-in"
            onClick={closeModal}
          />
          {/* Modal acotado a 90vh (columna flex) con el editor haciendo scroll
              POR DENTRO (max-height + overflow-y:auto): sin esto, un texto
              largo hacía crecer el modal más allá de la ventana y —como el
              overlay es items-center y el body va con overflow:hidden— el
              contenido sobrante quedaba inalcanzable. */}
          <div className="relative w-full max-w-2xl z-10 bg-white rounded-2xl shadow-premium-lg border border-slate-200/60 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">{modalTitle || placeholder}</h3>
                {modalSubtitle && <p className="text-xs text-slate-400 mt-0.5">{modalSubtitle}</p>}
              </div>
              <button
                type="button"
                aria-label={closeLabel}
                onClick={closeModal}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 flex-1 min-h-0 overflow-y-auto">
              <RichTextField
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus
                className="border border-slate-200 rounded-xl bg-slate-50/50 focus-within:border-[#0F4C81] focus-within:bg-white transition-colors overflow-hidden"
                style={{
                  fontSize: '15px',
                  lineHeight: 1.7,
                  color: '#1F2937',
                  padding: '14px 16px',
                  minHeight: '45vh',
                  maxHeight: 'calc(90vh - 170px)',
                  overflowY: 'auto',
                }}
              />
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
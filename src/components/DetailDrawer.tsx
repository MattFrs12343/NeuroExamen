import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Icono del encabezado (lucide-react) */
  icon: ReactNode;
  /** Texto chico uppercase del encabezado (ej: t('laudos_details_title')) */
  eyebrow: string;
  /** Título grande (ej: #LAU-2026-0001) */
  title: string;
  /** Clases opcionales para el cuadro del icono (theming por clínica p.ej.) */
  iconBoxClassName?: string;
  /** Contenido extra debajo del encabezado (badges de estado, etc.) */
  headerExtra?: ReactNode;
  /** Pie de acciones (botones) */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Drawer de detalle de documento — la ÚNICA forma de mostrar el detalle en
 * todas las listas. Se renderiza con createPortal() sobre document.body para
 * que el overlay con blur cubra TODA la pantalla (header y sidebar inclusive):
 * si se renderizara dentro del árbol de la vista, el transform retenido por
 * animate-fade-in en <main> lo confinaría al área de contenido y los títulos
 * de fondo se mezclarían con el difuminado.
 */
export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  open, onClose, icon, eyebrow, title, iconBoxClassName, headerExtra, footer, children,
}) => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    const restore = () => { document.body.style.overflow = prev; };

    if (!open) { restore(); return; }

    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); restore(); };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-premium-lg flex flex-col animate-slide-in">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={iconBoxClassName || 'p-2.5 rounded-xl bg-[#0F4C81]/8 border border-[#0F4C81]/15'}>
                {icon}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">{eyebrow}</p>
                <p className="text-lg font-bold text-slate-900 tracking-tight">{title}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={18} />
            </button>
          </div>
          {headerExtra}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/60 grid grid-cols-2 gap-2">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
};
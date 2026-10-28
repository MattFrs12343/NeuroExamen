import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, FileText, ClipboardList, Layers } from 'lucide-react';
import type { OrderPrintMode } from '../types';
import { cn } from '../lib/utils';

interface OrderPrintModeModalProps {
  initialMode?: OrderPrintMode;
  onClose: () => void;
  onConfirm: (mode: OrderPrintMode) => void;
}

/**
 * Pregunta qué imprimir cuando el pedido incluye exámenes con justificación
 * médica (Dinamômetro / Estesiômetro / Equilíbrio — SPECIALIZED_EXAM_IDS).
 *
 * "Ambos" reproduce el comportamiento histórico: hoja de pedido + documento
 * de justificación. La elección se guarda en el pedido (`printMode`) para que
 * las reimpresiones y el PDF firmado respeten lo mismo.
 */
export const OrderPrintModeModal: React.FC<OrderPrintModeModalProps> = ({
  initialMode = 'both',
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<OrderPrintMode>(initialMode);

  const options: { value: OrderPrintMode; label: string; desc: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
    { value: 'justification', label: t('order_print_mode_justification'), desc: t('order_print_mode_justification_desc'), icon: FileText },
    { value: 'order', label: t('order_print_mode_order'), desc: t('order_print_mode_order_desc'), icon: ClipboardList },
    { value: 'both', label: t('order_print_mode_both'), desc: t('order_print_mode_both_desc'), icon: Layers },
  ];

  // createPortal -> document.body: las vistas se renderizan dentro de <main
  // className="animate-fade-in">, cuyo transform retenido confinaría un modal
  // con position:fixed al área de contenido (se ve "roto", empujado hacia
  // abajo, con scroll propio) en vez de cubrir el viewport real. Mismo
  // patrón que PrintOptionsModal/DetailDrawer.
  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-print-mode-title"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-premium-lg flex flex-col max-h-[85vh] animate-fade-in"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <p id="order-print-mode-title" className="text-base font-bold text-slate-900">{t('order_print_mode_title')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('order_print_mode_subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {options.map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                mode === value
                  ? 'bg-[#0F4C81]/8 border-[#0F4C81]/30'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              )}
            >
              <span className={cn(
                'p-2 rounded-lg border shrink-0',
                mode === value
                  ? 'bg-[#0F4C81]/10 border-[#0F4C81]/20 text-[#0F4C81]'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              )}>
                <Icon size={15} />
              </span>
              <span className="min-w-0">
                <span className={cn('block text-sm font-semibold', mode === value ? 'text-[#0F4C81]' : 'text-slate-800')}>
                  {label}
                </span>
                <span className="block text-xs text-slate-400 mt-0.5 leading-snug">{desc}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-all"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(mode)}
            className="flex-1 h-10 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-bold shadow-sm transition-all"
          >
            {t('order_print_mode_confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

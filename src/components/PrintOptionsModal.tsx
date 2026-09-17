import { useTranslation } from 'react-i18next';
import { Printer, X, FileSignature } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';

interface PrintOptionsModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  signing?: boolean;
  onPrint: () => void;
  onSignPrint: () => void;
  onClose: () => void;
}

// Modal genérico para imprimir SIN firma digital o FIRMAR e imprimir (con el
// QR de verificación + texto legal ICP-Brasil). Mismo patrón que la sección
// de Pedidos (PrintSelectionModal): un solo botón de imprimir abre el modal
// con las dos opciones anidadas, en vez de dos botones separados por fila.
export const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({
  open,
  title,
  subtitle,
  signing,
  onPrint,
  onSignPrint,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!open) return null;

  // createPortal -> document.body: las vistas se renderizan dentro de <main
  // className="animate-fade-in">, cuyo transform retenido confinaría un modal
  // con position:fixed al área de contenido (el mismo bug que sufría el
  // DetailDrawer). Portalear sobre el body lo ancla al viewport real.
  return createPortal(
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-premium-lg flex flex-col max-h-[85vh] animate-fade-in">

        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-bold text-slate-900">{t('print_options_title')}</p>
            <p className="text-xs text-slate-400 mt-1">{subtitle || title}</p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={onPrint}
            className="w-full flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all select-none bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
          >
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Printer size={16} />
            </span>
            <span className="flex-1 text-left">
              <span className="block font-semibold text-slate-800">{t('print')}</span>
              <span className="block text-xs text-slate-400 mt-0.5">{t('print_options_normal_desc')}</span>
            </span>
          </button>

          <button
            onClick={onSignPrint}
            disabled={signing}
            className="w-full flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all select-none bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="w-9 h-9 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center shrink-0">
              <FileSignature size={16} className={signing ? 'animate-pulse' : ''} />
            </span>
            <span className="flex-1 text-left">
              <span className="block font-semibold text-slate-800">{signing ? t('sign_print_loading') : t('save_sign_print')}</span>
              <span className="block text-xs text-slate-400 mt-0.5">{t('print_options_sign_desc')}</span>
            </span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
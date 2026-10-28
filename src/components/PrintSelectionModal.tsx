import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { Printer, X, FileSignature, FileText, ClipboardList, Layers } from 'lucide-react';
import { Button } from './ui/button';
import { cn, getErrorMessage } from '../lib/utils';
import { SPECIALIZED_EXAM_IDS } from '../data/specializedExamDocs';
import type { OrderPrintMode } from '../types';

interface PrintSelectionEntry {
  id: string;
  name: string;
  category: string;
}

export const PrintSelectionModal: React.FC = () => {
  const { t } = useTranslation();
  const { orderPendingPrintSelection, exams, confirmPrintSelection, cancelPrintSelection, triggerSignAndPrint, updateOrder } = useApp();

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [checkedForOrderId, setCheckedForOrderId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<OrderPrintMode>('both');
  const [busy, setBusy] = useState(false);
  const [signing, setSigning] = useState(false);

  const order = orderPendingPrintSelection;

  const entries: PrintSelectionEntry[] = order
    ? (() => {
        const customExamsMap = (order.customExams as Record<string, { id: string; name: string; category: string }>) || {};
        const list: PrintSelectionEntry[] = [];
        order.exams.forEach((examId) => {
          let exam = exams.find(e => e.id === examId);
          if (!exam && customExamsMap[examId]) {
            const info = customExamsMap[examId];
            exam = { id: examId, name: info.name, category: info.category };
          }
          if (!exam) return;
          list.push({ id: exam.id, name: exam.name, category: exam.category });
        });
        return list;
      })()
    : [];

  // Solo tiene sentido preguntar cuando el pedido trae exámenes con
  // justificación médica; en el resto de los pedidos se imprime como siempre.
  const hasSpecialized = entries.some(e => SPECIALIZED_EXAM_IDS.has(e.id));
  const effectiveMode: OrderPrintMode = hasSpecialized ? printMode : 'both';

  // Reset selection when a new order is opened for printing. Done during
  // render (not in an effect) so the checkboxes never flash unchecked.
  if (order && order.id !== checkedForOrderId) {
    setCheckedForOrderId(order.id);
    setChecked(Object.fromEntries(entries.map((_, idx) => [idx, true])));
    setPrintMode(order.printMode ?? 'both');
  }

  if (!order) return null;

  const toggle = (idx: number) => setChecked(prev => ({ ...prev, [idx]: !prev[idx] }));
  const selectAll = () => setChecked(Object.fromEntries(entries.map((_, idx) => [idx, true])));
  const selectNone = () => setChecked(Object.fromEntries(entries.map((_, idx) => [idx, false])));

  const selectedIds = entries.filter((_, idx) => checked[idx]).map(e => e.id);
  const selectedHasSpecialized = selectedIds.some(id => SPECIALIZED_EXAM_IDS.has(id));

  const validate = (): boolean => {
    if (!selectedIds.length) { alert(t('print_select_empty_alert')); return false; }
    if (effectiveMode === 'justification' && !selectedHasSpecialized) {
      alert(t('order_print_mode_required'));
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setBusy(true);
    try {
      await confirmPrintSelection(selectedIds, effectiveMode);
    } catch (e) {
      alert(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSignAndPrint = async () => {
    if (!order) return;
    if (!validate()) return;
    setSigning(true);
    try {
      // Persistir el modo elegido para que las próximas reimpresiones lo
      // respeten (el PDF firmado igual lo recibe explícito por query).
      if (hasSpecialized && effectiveMode !== (order.printMode ?? 'both')) {
        try { await updateOrder({ ...order, printMode: effectiveMode }); }
        catch { /* la firma no depende de que se guarde el modo */ }
      }
      await triggerSignAndPrint('order', order, { examIds: selectedIds, printMode: effectiveMode });
      cancelPrintSelection();
    } catch (e) {
      alert(t('sign_pdf_error', { message: getErrorMessage(e) }));
    } finally {
      setSigning(false);
    }
  };

  const checkedCount = selectedIds.length;

  const modeOptions: { value: OrderPrintMode; label: string; desc: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
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
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={cancelPrintSelection} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-premium-lg flex flex-col max-h-[85vh] animate-fade-in">

        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-bold text-slate-900">{t('print_select_title')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('print_select_subtitle')}</p>
          </div>
          <button onClick={cancelPrintSelection}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {hasSpecialized && (
          <div className="px-4 py-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
            <p className="text-xs font-bold text-slate-700">{t('order_print_mode_title')}</p>
            <p className="text-[11px] text-slate-400 leading-snug">{t('order_print_mode_subtitle')}</p>
            <div className="grid grid-cols-1 gap-1.5">
              {modeOptions.map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPrintMode(value)}
                  className={cn(
                    'flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all',
                    effectiveMode === value
                      ? 'bg-[#0F4C81]/8 border-[#0F4C81]/30'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  )}
                >
                  <Icon size={14} className={cn('mt-0.5 shrink-0', effectiveMode === value ? 'text-[#0F4C81]' : 'text-slate-400')} />
                  <span className="min-w-0">
                    <span className={cn('block text-xs font-semibold', effectiveMode === value ? 'text-[#0F4C81]' : 'text-slate-700')}>{label}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 leading-snug">{desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">
            {checkedCount} / {entries.length}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs font-semibold text-[#0F4C81] hover:underline">
              {t('print_select_all')}
            </button>
            <button onClick={selectNone} className="text-xs font-semibold text-slate-400 hover:underline">
              {t('print_select_none')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {entries.map((entry, idx) => (
            <label key={idx} className={cn(
              'flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all select-none',
              checked[idx]
                ? 'bg-[#0F4C81]/8 border-[#0F4C81]/30 text-[#0F4C81]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            )}>
              <input
                type="checkbox"
                checked={!!checked[idx]}
                onChange={() => toggle(idx)}
                className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-[#0F4C81]"
              />
              <span className="leading-snug">{t(entry.name)}</span>
            </label>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={cancelPrintSelection}>
              {t('cancel')}
            </Button>
            <Button size="sm" disabled={busy || signing} className="flex-1 bg-[#0F4C81] hover:bg-[#0a3a63] disabled:opacity-50" onClick={handleConfirm}>
              <Printer size={14} /> {t('print_select_confirm')}
            </Button>
          </div>
          <Button size="sm" disabled={signing || busy} className="w-full bg-[#0F4C81] hover:bg-[#0a3a63] disabled:opacity-50" onClick={handleSignAndPrint}>
            <FileSignature size={14} className={signing ? 'animate-pulse' : ''} />
            {signing ? t('sign_print_loading') : t('save_sign_print')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

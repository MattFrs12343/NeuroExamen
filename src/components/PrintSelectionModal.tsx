import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { Printer, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface PrintSelectionEntry {
  id: string;
  name: string;
  category: string;
}

export const PrintSelectionModal: React.FC = () => {
  const { t } = useTranslation();
  const { orderPendingPrintSelection, exams, confirmPrintSelection, cancelPrintSelection } = useApp();

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [checkedForOrderId, setCheckedForOrderId] = useState<string | null>(null);

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

  // Reset selection when a new order is opened for printing. Done during
  // render (not in an effect) so the checkboxes never flash unchecked.
  if (order && order.id !== checkedForOrderId) {
    setCheckedForOrderId(order.id);
    setChecked(Object.fromEntries(entries.map((_, idx) => [idx, true])));
  }

  if (!order) return null;

  const toggle = (idx: number) => setChecked(prev => ({ ...prev, [idx]: !prev[idx] }));
  const selectAll = () => setChecked(Object.fromEntries(entries.map((_, idx) => [idx, true])));
  const selectNone = () => setChecked(Object.fromEntries(entries.map((_, idx) => [idx, false])));

  const handleConfirm = () => {
    const selectedIds = entries.filter((_, idx) => checked[idx]).map(e => e.id);
    if (!selectedIds.length) { alert(t('print_select_empty_alert')); return; }
    confirmPrintSelection(selectedIds);
  };

  const checkedCount = entries.filter((_, idx) => checked[idx]).length;

  return (
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

        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={cancelPrintSelection}>
            {t('cancel')}
          </Button>
          <Button size="sm" className="flex-1 bg-[#0F4C81] hover:bg-[#0a3a63]" onClick={handleConfirm}>
            <Printer size={14} /> {t('print_select_confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
};

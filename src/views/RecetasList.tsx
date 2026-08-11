import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Receta } from '../types';
import {
  PlusCircle, Search, Calendar, Filter, RefreshCw,
  Edit3, Printer, X, Pill, User,
  ChevronLeft, ChevronRight, Activity, Eye, Trash2, Building2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';

const PAGE_SIZE = 15;

export const RecetasList: React.FC = () => {
  const { t } = useTranslation();
  const { recetas, setCurrentView, triggerDirectPrintReceta, deleteReceta, setActiveRecetaForEdit } = useApp();

  const [filterPatient,  setFilterPatient]  = useState('');
  const [filterStart,    setFilterStart]    = useState('');
  const [filterEnd,      setFilterEnd]      = useState('');
  const [appliedPatient, setAppliedPatient] = useState('');
  const [appliedStart,   setAppliedStart]   = useState('');
  const [appliedEnd,     setAppliedEnd]     = useState('');
  const [selectedReceta, setSelectedReceta] = useState<Receta | null>(null);
  const [currentPage,    setCurrentPage]    = useState(1);

  const applyFilters = () => {
    setAppliedPatient(filterPatient); setAppliedStart(filterStart); setAppliedEnd(filterEnd);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterPatient(''); setFilterStart(''); setFilterEnd('');
    setAppliedPatient(''); setAppliedStart(''); setAppliedEnd('');
    setCurrentPage(1);
  };

  const filtered = useMemo(() => recetas.filter(r => {
    if (appliedPatient.trim()) {
      const q = appliedPatient.toLowerCase();
      if (!r.patientName.toLowerCase().includes(q) && !r.patientIdentityCard.includes(q)) return false;
    }
    if (appliedStart && (!r.date || r.date < appliedStart)) return false;
    if (appliedEnd   && (!r.date || r.date > appliedEnd))   return false;
    return true;
  }), [recetas, appliedPatient, appliedStart, appliedEnd]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    const set = new Set([1, totalPages, safePage - 1, safePage, safePage + 1].filter(p => p >= 1 && p <= totalPages));
    let prev = 0;
    [...set].sort((a, b) => a - b).forEach(p => {
      if (p - prev > 1) pages.push('...');
      pages.push(p); prev = p;
    });
    return pages;
  }, [totalPages, safePage]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(t('confirm_delete', { name }))) return;
    try {
      await deleteReceta(id);
      if (selectedReceta?.id === id) setSelectedReceta(null);
    } catch (err: any) { alert('Error: ' + err.message); }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('recetas_title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('recetas_subtitle')}</p>
        </div>
        <Button
          onClick={() => { setActiveRecetaForEdit(null); setCurrentView('new-receta'); }}
          className="self-start sm:self-auto bg-[#0F4C81] hover:bg-[#0a3a63] shadow-sm hover:shadow-md transition-all"
        >
          <PlusCircle size={16} strokeWidth={2} />
          {t('recetas_new_btn')}
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-[#0F4C81]/8 border border-[#0F4C81]/15">
            <Filter size={15} className="text-[#0F4C81]" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{t('ord_filter_title')}</p>
            <p className="text-xs text-slate-400 mt-0.5">Filtra por paciente o fecha</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">{t('print_pat_info')}</label>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
                <Input className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white" placeholder={t('ord_filter_pat_placeholder')} value={filterPatient} onChange={e => setFilterPatient(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">{t('ord_filter_start')}</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
                <Input type="date" className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">{t('ord_filter_end')}</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
                <Input type="date" className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-5 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="hover:bg-slate-100">
              <RefreshCw size={14} /> {t('ord_filter_clear')}
            </Button>
            <Button size="sm" onClick={applyFilters} className="bg-[#0F4C81] hover:bg-[#0a3a63]">
              {t('ord_filter_btn')}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                {[t('pat_col_name'), t('date'), t('print_clinic_label'), t('recetas_col_meds'), t('ord_col_doctor'), t('actions')].map((h, i) => (
                  <th key={i} className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Pill size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600">{t('recetas_no_found')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ajusta los filtros o crea una nueva receta</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paged.map(receta => (
                <tr key={receta.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => setSelectedReceta(receta)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(receta.patientName)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{receta.patientName}</p>
                        <p className="text-xs text-slate-400">DNI: {receta.patientIdentityCard}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-300" />
                      <span className="text-sm font-medium text-slate-600 whitespace-nowrap">{receta.date || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {receta.clinicName ? (
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="text-slate-300" />
                        <span className="text-xs text-slate-600 max-w-[160px] truncate">{receta.clinicName}</span>
                      </div>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Pill size={13} className="text-slate-300" />
                      <span className="text-sm font-medium text-slate-600">{receta.medications.length}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Activity size={13} className="text-slate-300" />
                      <span className="text-xs text-slate-500 truncate max-w-[120px]">{receta.createdBy}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-0.5">
                      <button
                        title={t('ord_tooltip_view')}
                        onClick={e => { e.stopPropagation(); setSelectedReceta(receta); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-[#0F4C81] hover:bg-[#0F4C81]/8 transition-all"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title={t('edit')}
                        onClick={e => { e.stopPropagation(); setActiveRecetaForEdit(receta); setCurrentView('new-receta'); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        title={t('print')}
                        onClick={e => { e.stopPropagation(); triggerDirectPrintReceta(receta); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                      >
                        <Printer size={15} />
                      </button>
                      <button
                        title={t('delete')}
                        onClick={e => { e.stopPropagation(); handleDelete(receta.id, receta.patientName); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-500">
              Mostrando {paged.length === 0 ? 0 : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)}`} de {filtered.length}
            </span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-transparent text-slate-500 hover:bg-white hover:border-slate-200 disabled:opacity-30 transition-all">
                <ChevronLeft size={16} />
              </button>
              {pageNumbers.map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-sm text-slate-300">…</span>
                  : <button key={p} onClick={() => setCurrentPage(p as number)}
                      className={cn('w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold border transition-all',
                        safePage === p
                          ? 'bg-[#0F4C81] text-white border-[#0F4C81] shadow-sm'
                          : 'text-slate-600 border-transparent hover:bg-white hover:border-slate-200')}>
                      {p}
                    </button>
              )}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-transparent text-slate-500 hover:bg-white hover:border-slate-200 disabled:opacity-30 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Drawer ───────────────────────────────────────────────── */}
      {selectedReceta && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={() => setSelectedReceta(null)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-premium-lg flex flex-col animate-slide-in">

            <div className="px-6 py-5 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#0F4C81]/8 border border-[#0F4C81]/15">
                    <Pill size={18} className="text-[#0F4C81]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">{t('recetas_details_title')}</p>
                    <p className="text-lg font-bold text-slate-900 tracking-tight">#{selectedReceta.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReceta(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <User size={14} className="text-[#0F4C81]" />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('ord_details_patient')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-sm font-bold">
                    {getInitials(selectedReceta.patientName)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">{selectedReceta.patientName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>DNI: <span className="font-semibold text-slate-700">{selectedReceta.patientIdentityCard}</span></span>
                      <span className="text-slate-300">·</span>
                      <span>{selectedReceta.date || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedReceta.clinicName && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={14} className="text-[#06B6D4]" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('print_clinic_label')}</p>
                  </div>
                  <p className="text-sm text-slate-700">{selectedReceta.clinicName}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pill size={14} className="text-emerald-600" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('receta_sec_medications')}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">({selectedReceta.medications.length})</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedReceta.medications.map((m, idx) => (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <p className="flex-1 min-w-0 text-xs text-slate-700 leading-snug whitespace-pre-wrap">{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedReceta.observations && (
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('observations')}</p>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedReceta.observations}</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                <Activity size={12} />
                {t('ord_details_creator')}: <span className="font-semibold text-slate-600">{selectedReceta.createdBy}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/60 grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm"
                onClick={() => { triggerDirectPrintReceta(selectedReceta); setSelectedReceta(null); }}>
                <Printer size={14} /> {t('print')}
              </Button>
              <Button size="sm" className="bg-[#0F4C81] hover:bg-[#0a3a63]"
                onClick={() => { setActiveRecetaForEdit(selectedReceta); setCurrentView('new-receta'); setSelectedReceta(null); }}>
                <Edit3 size={14} /> {t('edit')}
              </Button>
              <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 hover:border-red-200 border-red-200"
                onClick={() => handleDelete(selectedReceta.id, selectedReceta.patientName)}>
                {t('delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

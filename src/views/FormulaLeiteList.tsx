import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { FormulaLeite } from '../types';
import {
  PlusCircle, Search, Calendar, Filter, RefreshCw,
  Edit3, Printer, Milk, User,
  ChevronLeft, ChevronRight, Activity, Eye, Trash2, Building2, Phone,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DetailDrawer } from '../components/DetailDrawer';
import { cn, getErrorMessage } from '../lib/utils';
import { isoToBRDate } from '../lib/dates';

const PAGE_SIZE = 15;

export const FormulaLeiteList: React.FC = () => {
  const { t } = useTranslation();
  const {
    formulaLeites, setCurrentView, triggerDirectPrintFormulaLeite, deleteFormulaLeite, setActiveFormulaLeiteForEdit,
  } = useApp();

  const [filterPatient,  setFilterPatient]  = useState('');
  const [filterStart,    setFilterStart]    = useState('');
  const [filterEnd,      setFilterEnd]      = useState('');
  const [appliedPatient, setAppliedPatient] = useState('');
  const [appliedStart,   setAppliedStart]   = useState('');
  const [appliedEnd,     setAppliedEnd]     = useState('');
  const [selectedDoc,    setSelectedDoc]    = useState<FormulaLeite | null>(null);
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

  const filtered = useMemo(() => formulaLeites.filter(f => {
    if (appliedPatient.trim()) {
      const q = appliedPatient.toLowerCase();
      if (!f.patientName.toLowerCase().includes(q)) return false;
    }
    if (appliedStart && f.firstConsultDate && f.firstConsultDate < appliedStart) return false;
    if (appliedEnd   && f.firstConsultDate && f.firstConsultDate > appliedEnd)   return false;
    return true;
  }), [formulaLeites, appliedPatient, appliedStart, appliedEnd]);

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
    if (!window.confirm(t('formula_leite_confirm_delete', { name }))) return;
    try {
      await deleteFormulaLeite(id);
      if (selectedDoc?.id === id) setSelectedDoc(null);
    } catch (err) { alert('Error: ' + getErrorMessage(err)); }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('formula_leite_title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('formula_leite_subtitle')}</p>
        </div>
        <Button
          onClick={() => { setActiveFormulaLeiteForEdit(null); setCurrentView('new-formula-leite'); }}
          className="self-start sm:self-auto bg-[#0F4C81] hover:bg-[#0a3a63] shadow-sm hover:shadow-md transition-all"
        >
          <PlusCircle size={16} strokeWidth={2} />
          {t('formula_leite_new_btn')}
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
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full text-left data-table">
            <thead>
              <tr className="border-b border-slate-100">
                {[t('pat_col_name'), t('date'), t('print_cid'), t('ord_col_doctor'), t('actions')].map((h, i) => (
                  <th key={i} className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Milk size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600">{t('formula_leite_no_found')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ajusta los filtros o crea una nueva ficha</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paged.map(doc => (
                <tr key={doc.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(doc.patientName)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{doc.patientName}</p>
                        <p className="text-xs text-slate-400">{doc.institutionName || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-300" />
                      <span className="text-sm font-medium text-slate-600 whitespace-nowrap">{doc.firstConsultDate ? isoToBRDate(doc.firstConsultDate) : '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{doc.cid || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Activity size={13} className="text-slate-300" />
                      <span className="text-xs text-slate-500 truncate max-w-[160px]">{doc.professionalName || doc.createdBy}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-0.5">
                      <button
                        title={t('ord_tooltip_view')}
                        onClick={e => { e.stopPropagation(); setSelectedDoc(doc); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-[#0F4C81] hover:bg-[#0F4C81]/8 transition-all"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title={t('edit')}
                        onClick={e => { e.stopPropagation(); setActiveFormulaLeiteForEdit(doc); setCurrentView('new-formula-leite'); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        title={t('print')}
                        onClick={e => { e.stopPropagation(); triggerDirectPrintFormulaLeite(doc); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                      >
                        <Printer size={15} />
                      </button>
                      <button
                        title={t('delete')}
                        onClick={e => { e.stopPropagation(); handleDelete(doc.id, doc.patientName); }}
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

        {/* ── Mobile cards ─────────────────────────────────────────────── */}
        <div className="xl:hidden divide-y divide-slate-100">
          {paged.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Milk size={24} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">{t('formula_leite_no_found')}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Ajusta los filtros o crea una nueva ficha</p>
                </div>
              </div>
            </div>
          ) : paged.map(doc => (
            <div key={doc.id} className="p-4 active:bg-slate-50" onClick={() => setSelectedDoc(doc)}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] text-sm font-bold flex items-center justify-center shrink-0">
                  {getInitials(doc.patientName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{doc.patientName}</p>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><Calendar size={11} />{doc.firstConsultDate ? isoToBRDate(doc.firstConsultDate) : '—'}</span>
                    {doc.cid && <span>CID: {doc.cid}</span>}
                    {doc.institutionName && <span className="truncate max-w-[160px]">{doc.institutionName}</span>}
                  </div>
                </div>
              </div>

              {/* Actions row — full-width, evenly divided touch targets */}
              <div className="flex items-stretch gap-1.5 mt-3 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                <button
                  aria-label={t('ord_tooltip_view')}
                  onClick={() => setSelectedDoc(doc)}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-[#0F4C81]/10 active:text-[#0F4C81] transition-colors"
                >
                  <Eye size={18} />
                </button>
                <button
                  aria-label={t('edit')}
                  onClick={() => { setActiveFormulaLeiteForEdit(doc); setCurrentView('new-formula-leite'); }}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-slate-200 transition-colors"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  aria-label={t('print')}
                  onClick={() => triggerDirectPrintFormulaLeite(doc)}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-emerald-100 active:text-emerald-600 transition-colors"
                >
                  <Printer size={18} />
                </button>
                <button
                  aria-label={t('delete')}
                  onClick={() => handleDelete(doc.id, doc.patientName)}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-red-100 active:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
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
      {selectedDoc && (
        <DetailDrawer
          open={true}
          onClose={() => setSelectedDoc(null)}
          icon={<Milk size={18} className="text-[#0F4C81]" />}
          eyebrow={t('formula_leite_details_title')}
          title={`#${selectedDoc.id}`}
          footer={<>
            <Button variant="outline" size="sm"
              onClick={() => { triggerDirectPrintFormulaLeite(selectedDoc); setSelectedDoc(null); }}>
              <Printer size={14} /> {t('print')}
            </Button>
            <Button size="sm" className="bg-[#0F4C81] hover:bg-[#0a3a63]"
              onClick={() => { setActiveFormulaLeiteForEdit(selectedDoc); setCurrentView('new-formula-leite'); setSelectedDoc(null); }}>
              <Edit3 size={14} /> {t('edit')}
            </Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 hover:border-red-200 border-red-200"
              onClick={() => handleDelete(selectedDoc.id, selectedDoc.patientName)}>
              {t('delete')}
            </Button>
          </>}
        >
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <User size={14} className="text-[#0F4C81]" />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('ord_details_patient')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-sm font-bold">
                    {getInitials(selectedDoc.patientName)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">{selectedDoc.patientName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {selectedDoc.patientBirthDate && <span>{selectedDoc.patientBirthDate}</span>}
                      {selectedDoc.motherName && (<><span className="text-slate-300">·</span><span>Mãe: {selectedDoc.motherName}</span></>)}
                    </div>
                    {selectedDoc.patientPhone && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
                        <Phone size={12} className="text-emerald-600" />
                        <span className="font-semibold">{selectedDoc.patientPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedDoc.institutionName && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={14} className="text-[#06B6D4]" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Instituição</p>
                  </div>
                  <p className="text-sm text-slate-700">{selectedDoc.institutionName}{selectedDoc.cnes ? ` · CNES ${selectedDoc.cnes}` : ''}</p>
                </div>
              )}

              {(selectedDoc.cid || selectedDoc.diagnostico) && (
                <div className="rounded-xl border border-slate-200 p-5">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('print_cid')}</p>
                  <p className="text-sm font-semibold text-slate-900">{selectedDoc.cid || '—'}</p>
                  {selectedDoc.diagnostico && <p className="text-xs text-slate-500 mt-1">{selectedDoc.diagnostico}</p>}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={14} className="text-[#0F4C81]" />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Resumo clínico</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sintomas</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedDoc.symptoms?.filter(s => s.checked).length || 0} marcados</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Exames</p>
                    <p className="text-sm font-semibold text-slate-900">{selectedDoc.exams?.filter(e => e.sim !== null && e.sim !== undefined).length || 0} marcados</p>
                  </div>
                </div>
              </div>

              {selectedDoc.condutaOption && (
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('formula_leite_sec_conduta')}</p>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-sm text-slate-700">
                      {selectedDoc.condutaOption === 'liberado'
                        ? `Liberado: ${selectedDoc.formulaLatas || '—'} latas por ${selectedDoc.formulaMeses || '—'} meses`
                        : 'No momento, não preenche os critérios'}
                    </p>
                  </div>
                </div>
              )}

              {selectedDoc.professionalName && (
                <div className="rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={14} className="text-[#0F4C81]" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Profissional</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{selectedDoc.professionalName}</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                <Activity size={12} />
                {t('ord_details_creator')}: <span className="font-semibold text-slate-600">{selectedDoc.createdBy}</span>
              </div>
        </DetailDrawer>
      )}
    </div>
  );
};

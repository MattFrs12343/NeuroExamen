import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Laudo } from '../types';
import {
  PlusCircle, Search, Calendar, Filter, RefreshCw,
  Edit3, Printer, Scale, User,
  ChevronLeft, ChevronRight, Activity, Eye, Trash2, Building2, Gavel,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon';
import { DetailDrawer } from '../components/DetailDrawer';
import { PrintOptionsModal } from '../components/PrintOptionsModal';
import { RichText } from '../components/RichText';
import { cn, getErrorMessage } from '../lib/utils';
import { openWhatsApp, buildDocumentWhatsAppMessage, stripDoctorPrefix } from '../lib/whatsapp';
import { printSignedPdf } from '../lib/signedPdf';

const PAGE_SIZE = 15;

const formatDateDisplay = (iso?: string | null): string | undefined => {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const getInitials = (name?: string | null) =>
  name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '—';

export const LaudosList: React.FC = () => {
  const { t } = useTranslation();
  const {
    laudos, setCurrentView, triggerDirectPrintLaudo,
    deleteLaudo, setActiveLaudoForEdit,
    setSignPrintBusy,
  } = useApp();

  const [filterPatient,  setFilterPatient]  = useState('');
  const [filterStart,    setFilterStart]    = useState('');
  const [filterEnd,      setFilterEnd]      = useState('');
  const [appliedPatient, setAppliedPatient] = useState('');
  const [appliedStart,   setAppliedStart]   = useState('');
  const [appliedEnd,     setAppliedEnd]     = useState('');
  const [selected, setSelected] = useState<Laudo | null>(null);
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

  const filtered = useMemo(() => laudos.filter(l => {
    if (appliedPatient.trim()) {
      const q = appliedPatient.toLowerCase();
      if (!(l.patientName || '').toLowerCase().includes(q)) return false;
    }
    if (appliedStart && (!l.date || l.date < appliedStart)) return false;
    if (appliedEnd   && (!l.date || l.date > appliedEnd))   return false;
    return true;
  }), [laudos, appliedPatient, appliedStart, appliedEnd]);

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

  const [signingId, setSigningId] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<Laudo | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(t('confirm_delete', { name: name || '—' }))) return;
    try {
      await deleteLaudo(id);
      if (selected?.id === id) setSelected(null);
    } catch (err) { alert('Error: ' + getErrorMessage(err)); }
  };

  const handleSignPrint = async (laudo: Laudo) => {
    setSigningId(laudo.id);
    setSignPrintBusy(true);
    try {
      // El servidor arma el PDF de cero a partir de la fila en la base —
      // no hace falta el record en memoria, solo el id.
      await printSignedPdf('laudos', laudo.id);
    } catch (err) { alert(t('sign_pdf_error', { message: getErrorMessage(err) })); }
    finally { setSigningId(null); setSignPrintBusy(false); }
  };

  const handleEdit = (l: Laudo) => {
    setActiveLaudoForEdit(l);
    setCurrentView('new-laudo');
  };

  const handleSendWhatsApp = (l: Laudo, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!l.patientPhone?.trim()) { alert(t('whatsapp_phone_required')); return; }
    const message = buildDocumentWhatsAppMessage({
      patientName: l.patientName || '',
      docTypeLabel: t('laudo_whatsapp_doc'),
      doctorName: stripDoctorPrefix(l.createdBy),
      validationUrl: l.validationUrl,
      token: l.token,
      accessCode: l.accessCode,
    });
    if (openWhatsApp(l.patientPhone, message) === 'invalid-phone') { alert(t('whatsapp_phone_invalid')); return; }
  };

  const conclusaoBadge = (l: Laudo) => {
    if (!l.conclusao) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-slate-100 text-slate-500 border-slate-200">
          <Gavel size={11} />
          {t('laudo_conclusao_none')}
        </span>
      );
    }
    // Color solo para las 3 conclusiones originales, que son las que el
    // médico reconoce de un vistazo; las que agregue van en neutro. El TEXTO
    // sale del snapshot del laudo (conclusaoOpcoes) — o sea, el mismo que se
    // imprimió — con la traducción como red para los laudos viejos sin
    // snapshot. Para un id desconocido (opción borrada del catálogo y sin
    // snapshot) se muestra el id: mejor eso que la clave i18n "laudo_...".
    const colors: Record<string, string> = {
      apto: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      inapto_temporario: 'bg-amber-50 text-amber-700 border-amber-200',
      inapto_definitivo: 'bg-red-50 text-red-700 border-red-200',
    };
    const snapLabel = l.conclusaoOpcoes?.find(o => o.id === l.conclusao)?.label;
    const label = snapLabel ?? (colors[l.conclusao] ? t(`laudo_${l.conclusao}`) : l.conclusao);
    return (
      <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border', colors[l.conclusao] || 'bg-slate-100 text-slate-600 border-slate-200')}>
        <Gavel size={11} />
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('laudos_title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('laudos_subtitle')}</p>
        </div>
        <Button
          onClick={() => { setActiveLaudoForEdit(null); setCurrentView('new-laudo'); }}
          className="self-start sm:self-auto bg-[#0F4C81] hover:bg-[#0a3a63] shadow-sm hover:shadow-md transition-all"
        >
          <PlusCircle size={16} strokeWidth={2} />
          {t('laudos_new_btn')}
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
                {[t('pat_col_name'), t('date'), t('print_clinic_label'), t('laudo_conclusao_label'), t('ord_col_doctor'), t('actions')].map((h, i) => (
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
                        <Scale size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600">{t('laudos_no_found')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t('laudos_no_found_desc')}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paged.map(l => (
                <tr key={l.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => setSelected(l)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-bold flex items-center justify-center shrink-0">
                        {getInitials(l.patientName)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{l.patientName || '—'}</p>
                        {l.orgao && <p className="text-xs text-slate-400">{l.orgao}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-300" />
                      <span className="text-sm font-medium text-slate-600 whitespace-nowrap">{formatDateDisplay(l.date) || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {l.clinicName ? (
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="text-slate-300" />
                        <span className="text-xs text-slate-600 max-w-[180px] truncate">{l.clinicName}</span>
                      </div>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-4">{conclusaoBadge(l)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Activity size={13} className="text-slate-300" />
                      <span className="text-xs text-slate-500 truncate max-w-[120px]">{l.createdBy}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-0.5">
                      <button
                        title={t('ord_tooltip_view')}
                        onClick={e => { e.stopPropagation(); setSelected(l); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-[#0F4C81] hover:bg-[#0F4C81]/8 transition-all"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        title={t('print')}
                        onClick={e => { e.stopPropagation(); setPrintTarget(l); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                      >
                        <Printer size={15} />
                      </button>
                      <button
                        title={t('edit')}
                        onClick={e => { e.stopPropagation(); handleEdit(l); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        title={t('whatsapp_send_btn')}
                        onClick={e => handleSendWhatsApp(l, e)}
                        className="p-2 rounded-lg text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/8 transition-all"
                      >
                        <WhatsAppIcon size={15} />
                      </button>
                      <button
                        title={t('delete')}
                        onClick={e => { e.stopPropagation(); handleDelete(l.id, l.patientName || ''); }}
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
                  <Scale size={24} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">{t('laudos_no_found')}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t('laudos_no_found_desc')}</p>
                </div>
              </div>
            </div>
          ) : paged.map(l => (
            <div key={l.id} className="p-4 active:bg-slate-50" onClick={() => setSelected(l)}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] text-sm font-bold flex items-center justify-center shrink-0">
                  {getInitials(l.patientName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{l.patientName || '—'}</p>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><Calendar size={11} />{formatDateDisplay(l.date) || '—'}</span>
                    {l.clinicName && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[160px]"><Building2 size={11} />{l.clinicName}</span>
                    )}
                  </div>
                  <div className="mt-1.5">{conclusaoBadge(l)}</div>
                  {l.cids && <p className="text-xs text-slate-500 truncate mt-1.5">CID: {l.cids}</p>}
                </div>
              </div>

              <div className="flex items-stretch gap-1.5 mt-3 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                <button
                  aria-label={t('ord_tooltip_view')}
                  onClick={() => setSelected(l)}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-[#0F4C81]/10 active:text-[#0F4C81] transition-colors"
                >
                  <Eye size={18} />
                </button>
                <button
                  aria-label={t('print')}
                  onClick={() => setPrintTarget(l)}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-emerald-100 active:text-emerald-600 transition-colors"
                >
                  <Printer size={18} />
                </button>
                <button
                  aria-label={t('edit')}
                  onClick={() => handleEdit(l)}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-slate-200 transition-colors"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  aria-label={t('whatsapp_send_btn')}
                  onClick={() => handleSendWhatsApp(l)}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-[#25D366]/15 active:text-[#25D366] transition-colors"
                >
                  <WhatsAppIcon size={18} />
                </button>
                <button
                  aria-label={t('delete')}
                  onClick={() => handleDelete(l.id, l.patientName || '')}
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
      {selected && (
        <DetailDrawer
          open={true}
          onClose={() => setSelected(null)}
          icon={<Scale size={18} className="text-[#0F4C81]" />}
          eyebrow={t('laudos_details_title')}
          title={`#${selected.id}`}
          footer={<>
            <Button variant="outline" size="sm"
              onClick={() => { setPrintTarget(selected); setSelected(null); }}>
              <Printer size={14} /> {t('print')}
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => { handleEdit(selected); setSelected(null); }}>
              <Edit3 size={14} /> {t('edit')}
            </Button>
            <Button variant="outline" size="sm" className="text-[#25D366] hover:bg-[#25D366]/8 hover:border-[#25D366]/30 border-[#25D366]/20"
              onClick={() => handleSendWhatsApp(selected)}>
              <WhatsAppIcon size={14} /> {t('whatsapp_send_btn')}
            </Button>
            <Button variant="outline" size="sm" className="col-span-2 text-red-500 hover:bg-red-50 hover:border-red-200 border-red-200"
              onClick={() => handleDelete(selected.id, selected.patientName || '')}>
              <Trash2 size={14} /> {t('delete')}
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
                    {getInitials(selected.patientName)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">{selected.patientName || '—'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      <span>{formatDateDisplay(selected.date) || '—'}</span>
                      {selected.orgao && <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-600 font-semibold">{selected.orgao}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500">
                      {selected.patientBirthDate && <span><strong>{t('laudo_birth_label')}:</strong> {selected.patientBirthDate}</span>}
                      {selected.patientIdentityCard && <span><strong>{t('laudo_doc_label')}:</strong> {selected.patientIdentityCard}</span>}
                    </div>
                    {selected.patientPhone && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
                        <WhatsAppIcon size={12} />
                        <span className="font-semibold">{selected.patientPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selected.clinicName && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={14} className="text-[#06B6D4]" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('print_clinic_label')}</p>
                  </div>
                  <p className="text-sm text-slate-700">{selected.clinicName}</p>
                  {selected.doctorName && <p className="text-xs text-slate-500 mt-1">{selected.doctorName} — {selected.doctorCrm}</p>}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Scale size={14} className="text-[#0F4C81]" />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('laudo_conclusao_label')}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  {conclusaoBadge(selected)}
                  {selected.afastamentoDias != null && (
                    <p className="text-sm text-slate-700 mt-3">
                      <strong>{t('print_laudo_afastamento_label')}:</strong> {t('laudo_afastamento_de')} {selected.afastamentoDias} {t('laudo_dias')}
                    </p>
                  )}
                </div>
              </div>

              {selected.narrative && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User size={14} className="text-emerald-600" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('laudo_narrative_label')}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <RichText tag="p" className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap" html={selected.narrative} />
                  </div>
                </div>
              )}

              {(selected.cids || selected.diagnostico) && (
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {selected.cids && (
                    <p className="text-sm text-slate-700"><strong>CID 10:</strong> {selected.cids}</p>
                  )}
                  {selected.diagnostico && (
                    <p className="text-sm text-slate-700"><strong>{t('print_laudo_diagnostico_label')}</strong> {selected.diagnostico}</p>
                  )}
                </div>
              )}

              {selected.observacoes && (
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('laudo_observacoes_label')}</p>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <RichText tag="p" className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap" html={selected.observacoes} />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                <Activity size={12} />
                {t('ord_details_creator')}: <span className="font-semibold text-slate-600">{selected.createdBy}</span>
              </div>
        </DetailDrawer>
      )}

      {/* Print Options Modal */}
      <PrintOptionsModal
        open={!!printTarget}
        title={printTarget ? `#${printTarget.id}` : ''}
        subtitle={printTarget?.patientName || undefined}
        signing={!!printTarget && signingId === printTarget.id}
        onPrint={() => {
          if (!printTarget) return;
          const tgt = printTarget;
          setPrintTarget(null);
          triggerDirectPrintLaudo(tgt);
        }}
        onSignPrint={() => {
          if (!printTarget) return;
          handleSignPrint(printTarget);
        }}
        onClose={() => { if (!signingId) setPrintTarget(null); }}
      />
    </div>
  );
};
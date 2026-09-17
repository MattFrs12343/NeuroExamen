import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Order, OrderStatus } from '../types';
import {
  PlusCircle, Search, Calendar, Filter, RefreshCw,
  Edit3, Printer, FileCheck, User,
  Hash, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, XCircle, Activity, Eye, Trash2, Phone,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RichText } from '../components/RichText';
import { Select } from '../components/ui/select';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon';
import { DetailDrawer } from '../components/DetailDrawer';
import { cn, getErrorMessage, hasIdentity } from '../lib/utils';
import { isoToBRDate } from '../lib/dates';
import { openWhatsApp, buildDocumentWhatsAppMessage, stripDoctorPrefix } from '../lib/whatsapp';

const PAGE_SIZE = 15;

const statusConfig: Record<OrderStatus, { icon: typeof CheckCircle2; cls: string }> = {
  Concluido: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  Pendiente: { icon: AlertCircle,  cls: 'bg-amber-50 text-amber-600 border-amber-200'     },
  Cancelado: { icon: XCircle,      cls: 'bg-slate-100 text-slate-500 border-slate-200'    },
};

export const OrdersList: React.FC = () => {
  const { t } = useTranslation();
  const { orders, exams, setCurrentView, triggerDirectPrint, deleteOrder, setActiveOrderForEdit } = useApp();

  const [filterPatient,  setFilterPatient]  = useState('');
  const [filterStart,    setFilterStart]    = useState('');
  const [filterEnd,      setFilterEnd]      = useState('');
  const [filterStatus,   setFilterStatus]   = useState('Todos');
  const [appliedPatient, setAppliedPatient] = useState('');
  const [appliedStart,   setAppliedStart]   = useState('');
  const [appliedEnd,     setAppliedEnd]     = useState('');
  const [appliedStatus,  setAppliedStatus]  = useState('Todos');
  const [selectedOrder,  setSelectedOrder]  = useState<Order | null>(null);
  const [currentPage,    setCurrentPage]    = useState(1);

  const applyFilters = () => {
    setAppliedPatient(filterPatient); setAppliedStart(filterStart);
    setAppliedEnd(filterEnd); setAppliedStatus(filterStatus);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterPatient(''); setFilterStart(''); setFilterEnd(''); setFilterStatus('Todos');
    setAppliedPatient(''); setAppliedStart(''); setAppliedEnd(''); setAppliedStatus('Todos');
    setCurrentPage(1);
  };

  const filtered = useMemo(() => orders.filter(o => {
    if (appliedPatient.trim()) {
      const q = appliedPatient.toLowerCase();
      if (!o.patientName.toLowerCase().includes(q) && !(o.patientIdentityCard || '').includes(q)) return false;
    }
    if (appliedStatus !== 'Todos' && o.status !== appliedStatus) return false;
    if (appliedStart && o.date < appliedStart) return false;
    if (appliedEnd   && o.date > appliedEnd)   return false;
    return true;
  }), [orders, appliedPatient, appliedStart, appliedEnd, appliedStatus]);

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

  const statusText = (s: OrderStatus) => ({
    Concluido: t('status_completed'),
    Pendiente: t('status_pending'),
    Cancelado: t('status_cancelled'),
  }[s] ?? s);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(t('confirm_delete', { name }))) return;
    try {
      await deleteOrder(id);
      if (selectedOrder?.id === id) setSelectedOrder(null);
    } catch (err) { alert('Error: ' + getErrorMessage(err)); }
  };

  const handleSendWhatsApp = (order: Order, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!order.patientPhone?.trim()) { alert(t('whatsapp_phone_required')); return; }
    const message = buildDocumentWhatsAppMessage({
      patientName: order.patientName,
      docTypeLabel: 'seu pedido de exames',
      doctorName: stripDoctorPrefix(order.createdBy),
      validationUrl: order.validationUrl,
      token: order.token,
      accessCode: order.accessCode,
    });
    if (openWhatsApp(order.patientPhone, message) === 'invalid-phone') { alert(t('whatsapp_phone_invalid')); return; }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('ord_title')}</h1>
        <Button
          onClick={() => { setActiveOrderForEdit(null); setCurrentView('new-order'); }}
          className="self-start sm:self-auto bg-[#0F4C81] hover:bg-[#0a3a63] shadow-sm hover:shadow-md transition-all"
        >
          <PlusCircle size={16} strokeWidth={2} />
          {t('ord_new_btn')}
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
            <p className="text-xs text-slate-400 mt-0.5">Filtra por paciente, fecha o estado</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">{t('status')}</label>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-11 border-slate-200 bg-slate-50/50">
                <option value="Todos">{t('ord_filter_all_status')}</option>
                <option value="Pendiente">{t('status_pending')}</option>
                <option value="Concluido">{t('status_completed')}</option>
                <option value="Cancelado">{t('status_cancelled')}</option>
              </Select>
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
                {[t('pat_col_name'), t('date'), t('print_cid'), t('ord_col_exams'), t('status'), t('ord_col_doctor'), t('actions')].map((h, i) => (
                  <th key={i} className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <FileCheck size={24} className="text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600">{t('ord_no_found')}</p>
                        <p className="text-xs text-slate-400 mt-0.5">Ajusta los filtros o crea un nuevo pedido</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paged.map(order => {
                const cfg = statusConfig[order.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={order.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-bold flex items-center justify-center shrink-0">
                          {getInitials(order.patientName)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{order.patientName}</p>
                          <p className="text-xs text-slate-400">{hasIdentity(order.patientIdentityCard) ? `DNI: ${order.patientIdentityCard}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-slate-300" />
                        <span className="text-sm font-medium text-slate-600 whitespace-nowrap">{isoToBRDate(order.date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.codeCID ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#06B6D4]/8 border border-[#06B6D4]/15">
                          <Hash size={11} className="text-[#06B6D4]" />
                          <span className="font-mono text-xs font-bold text-[#06B6D4]">{order.codeCID}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileCheck size={13} className="text-slate-300" />
                        <span className="text-sm font-medium text-slate-600">
                          {order.exams.length}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold', cfg.cls)}>
                        <StatusIcon size={13} />
                        {statusText(order.status)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Activity size={13} className="text-slate-300" />
                        <span className="text-xs text-slate-500 truncate max-w-[120px]">{order.createdBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-0.5">
                        {/* Ver detalle */}
                        <button
                          title={t('ord_tooltip_view')}
                          onClick={e => { e.stopPropagation(); setSelectedOrder(order); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#0F4C81] hover:bg-[#0F4C81]/8 transition-all"
                        >
                          <Eye size={15} />
                        </button>
                        {/* Editar */}
                        <button
                          title={t('edit')}
                          onClick={e => { e.stopPropagation(); setActiveOrderForEdit(order); setCurrentView('new-order'); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                        >
                          <Edit3 size={15} />
                        </button>
                        {/* Imprimir */}
                        <button
                          title={t('print')}
                          onClick={e => { e.stopPropagation(); triggerDirectPrint(order); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        >
                          <Printer size={15} />
                        </button>
                        {/* WhatsApp */}
                        <button
                          title={t('whatsapp_send_btn')}
                          onClick={e => handleSendWhatsApp(order, e)}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#25D366] hover:bg-[#25D366]/8 transition-all"
                        >
                          <WhatsAppIcon size={15} />
                        </button>
                        {/* Eliminar */}
                        <button
                          title={t('delete')}
                          onClick={e => { e.stopPropagation(); handleDelete(order.id, order.patientName); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Mobile cards ─────────────────────────────────────────────── */}
        <div className="xl:hidden divide-y divide-slate-100">
          {paged.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <FileCheck size={24} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-600">{t('ord_no_found')}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Ajusta los filtros o crea un nuevo pedido</p>
                </div>
              </div>
            </div>
          ) : paged.map(order => {
            const cfg = statusConfig[order.status];
            const StatusIcon = cfg.icon;
            return (
              <div key={order.id} className="p-4 active:bg-slate-50" onClick={() => setSelectedOrder(order)}>
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] text-sm font-bold flex items-center justify-center shrink-0">
                    {getInitials(order.patientName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">{order.patientName}</p>
                      <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold shrink-0 whitespace-nowrap', cfg.cls)}>
                        <StatusIcon size={12} />
                        {statusText(order.status)}
                      </div>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1"><Calendar size={11} />{isoToBRDate(order.date)}</span>
                      {hasIdentity(order.patientIdentityCard) && <span>DNI: {order.patientIdentityCard}</span>}
                      <span className="inline-flex items-center gap-1"><FileCheck size={11} />{order.exams.length}</span>
                      {order.codeCID && (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[#06B6D4]">
                          <Hash size={11} />{order.codeCID}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions row — full-width, evenly divided touch targets */}
                <div className="flex items-stretch gap-1.5 mt-3 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                  <button
                    aria-label={t('ord_tooltip_view')}
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-[#0F4C81]/10 active:text-[#0F4C81] transition-colors"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    aria-label={t('edit')}
                    onClick={() => { setActiveOrderForEdit(order); setCurrentView('new-order'); }}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-slate-200 transition-colors"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    aria-label={t('print')}
                    onClick={() => triggerDirectPrint(order)}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-emerald-100 active:text-emerald-600 transition-colors"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    aria-label={t('whatsapp_send_btn')}
                    onClick={() => handleSendWhatsApp(order)}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-[#25D366]/15 active:text-[#25D366] transition-colors"
                  >
                    <WhatsAppIcon size={18} />
                  </button>
                  <button
                    aria-label={t('delete')}
                    onClick={() => handleDelete(order.id, order.patientName)}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-slate-500 bg-slate-50 active:bg-red-100 active:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
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
      {selectedOrder && (
        <DetailDrawer
          open={true}
          onClose={() => setSelectedOrder(null)}
          icon={<FileCheck size={18} className="text-[#0F4C81]" />}
          eyebrow={t('ord_details_title')}
          title={`Pedido #${selectedOrder.id}`}
          headerExtra={
            <div className="mt-4">
              {(() => {
                const cfg = statusConfig[selectedOrder.status];
                const SIcon = cfg.icon;
                return (
                  <div className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold', cfg.cls)}>
                    <SIcon size={16} />
                    {statusText(selectedOrder.status)}
                  </div>
                );
              })()}
            </div>
          }
          footer={<>
            <Button variant="outline" size="sm"
              onClick={() => { triggerDirectPrint(selectedOrder); setSelectedOrder(null); }}>
              <Printer size={14} /> {t('print')}
            </Button>
            <Button variant="outline" size="sm" className="text-[#25D366] hover:bg-[#25D366]/8 hover:border-[#25D366]/30 border-[#25D366]/20"
              onClick={() => handleSendWhatsApp(selectedOrder)}>
              <WhatsAppIcon size={14} /> {t('whatsapp_send_btn')}
            </Button>
            <Button size="sm" className="bg-[#0F4C81] hover:bg-[#0a3a63]"
              onClick={() => { setActiveOrderForEdit(selectedOrder); setCurrentView('new-order'); setSelectedOrder(null); }}>
              <Edit3 size={14} /> {t('edit')}
            </Button>
            <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 hover:border-red-200 border-red-200"
              onClick={() => handleDelete(selectedOrder.id, selectedOrder.patientName)}>
              {t('delete')}
            </Button>
          </>}
        >
              {/* Patient */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <User size={14} className="text-[#0F4C81]" />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('ord_details_patient')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-sm font-bold">
                    {getInitials(selectedOrder.patientName)}
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">{selectedOrder.patientName}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {hasIdentity(selectedOrder.patientIdentityCard) && (
                        <span>DNI: <span className="font-semibold text-slate-700">{selectedOrder.patientIdentityCard}</span></span>
                      )}
                      <span className="text-slate-300">·</span>
                      <span>{isoToBRDate(selectedOrder.date)}</span>
                    </div>
                    {selectedOrder.patientPhone && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
                        <Phone size={12} className="text-emerald-600" />
                        <span className="font-semibold">{selectedOrder.patientPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CID */}
              {selectedOrder.codeCID && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Hash size={14} className="text-[#06B6D4]" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('ord_details_cid')}</p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#06B6D4]/8 border border-[#06B6D4]/15">
                    <span className="font-mono text-base font-bold text-[#06B6D4]">{selectedOrder.codeCID}</span>
                  </div>
                </div>
              )}

              {/* Exams */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck size={14} className="text-emerald-600" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('ord_details_req')}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">({selectedOrder.exams.length})</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedOrder.exams.map((examId, idx) => {
                    const exam = exams.find(e => e.id === examId);
                    return (
                      <div key={examId} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                        <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 leading-snug">{exam ? t(exam.name) : examId}</p>
                          {exam?.category && (
                            <span className="inline-block mt-1.5 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                              {t(exam.category)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedOrder.observations && (
                <div>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">{t('observations')}</p>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <RichText tag="p" className="text-sm text-slate-700 leading-relaxed" html={selectedOrder.observations} />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                <Activity size={12} />
                {t('ord_details_creator')}: <span className="font-semibold text-slate-600">{selectedOrder.createdBy}</span>
              </div>
        </DetailDrawer>
      )}
    </div>
  );
};

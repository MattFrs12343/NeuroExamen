import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getStatusBadgeVariant } from '../utils/orderUtils';
import type { Order, OrderStatus } from '../types';
import {
  PlusCircle, Search, Calendar, Filter, RefreshCw,
  Eye, Edit3, Printer, Trash2, Download, X,
  FileCheck, User, Hash, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import { cn } from '../lib/utils';

const PAGE_SIZE = 15;
const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost/neuro-api/api';

export const OrdersList: React.FC = () => {
  const { t } = useTranslation();
  const { orders, exams, setCurrentView, triggerDirectPrint, deleteOrder, setActiveOrderForEdit } = useApp();

  const [filterPatient,   setFilterPatient]   = useState('');
  const [filterStart,     setFilterStart]     = useState('');
  const [filterEnd,       setFilterEnd]       = useState('');
  const [filterStatus,    setFilterStatus]    = useState('Todos');
  const [appliedPatient,  setAppliedPatient]  = useState('');
  const [appliedStart,    setAppliedStart]    = useState('');
  const [appliedEnd,      setAppliedEnd]      = useState('');
  const [appliedStatus,   setAppliedStatus]   = useState('Todos');
  const [selectedOrder,   setSelectedOrder]   = useState<Order | null>(null);
  const [currentPage,     setCurrentPage]     = useState(1);

  const applyFilters = () => {
    setAppliedPatient(filterPatient);
    setAppliedStart(filterStart);
    setAppliedEnd(filterEnd);
    setAppliedStatus(filterStatus);
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
      if (!o.patientName.toLowerCase().includes(q) && !o.patientIdentityCard.includes(q)) return false;
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
      pages.push(p);
      prev = p;
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
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handlePdf = async (orderId: string) => {
    const token = localStorage.getItem('neuro_token');
    if (!token) { alert('Sin conexión al servidor.'); return; }
    try {
      const res = await fetch(`${API}/orders/${orderId}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('No se pudo generar el PDF.');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `pedido_${orderId}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert('Error PDF: ' + e.message); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">{t('ord_title')}</h1>
        <Button onClick={() => { setActiveOrderForEdit(null); setCurrentView('new-order'); }} className="self-start sm:self-auto">
          <PlusCircle size={15} />
          {t('ord_new_btn')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter size={15} className="text-primary" />
            {t('ord_filter_title')}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{t('print_pat_info')}</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder={t('ord_filter_pat_placeholder')} value={filterPatient} onChange={e => setFilterPatient(e.target.value)} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{t('ord_filter_start')}</p>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="date" className="pl-8" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{t('ord_filter_end')}</p>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input type="date" className="pl-8" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{t('status')}</p>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="Todos">{t('ord_filter_all_status')}</option>
                <option value="Pendiente">{t('status_pending')}</option>
                <option value="Concluido">{t('status_completed')}</option>
                <option value="Cancelado">{t('status_cancelled')}</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <RefreshCw size={13} /> {t('ord_filter_clear')}
            </Button>
            <Button variant="secondary" size="sm" onClick={applyFilters}>
              {t('ord_filter_btn')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['ID', t('pat_col_name'), t('date'), t('print_cid'), t('ord_col_exams'), t('status'), t('ord_col_doctor'), t('actions')].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">{t('ord_no_found')}</td>
                </tr>
              ) : paged.map(order => (
                <tr key={order.id} className="hover:bg-sky-50/30 transition-colors group">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                      {order.id}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-slate-800">{order.patientName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">ID: {order.patientIdentityCard}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-600 whitespace-nowrap">{order.date}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                      {order.codeCID}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-600 whitespace-nowrap">
                    {order.exams.length} {order.exams.length === 1 ? t('exam_single') : t('exam_plural')}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={getStatusBadgeVariant(order.status)}>{statusText(order.status)}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{order.createdBy}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      {[
                        { Icon: Eye,      title: t('ord_tooltip_view'), action: () => setSelectedOrder(order),                                      cls: 'hover:text-sky-600 hover:bg-sky-50' },
                        { Icon: Edit3,    title: t('edit'),             action: () => { setActiveOrderForEdit(order); setCurrentView('new-order'); }, cls: 'hover:text-slate-700 hover:bg-slate-100' },
                        { Icon: Printer,  title: t('print'),            action: () => triggerDirectPrint(order),                                     cls: 'hover:text-teal-600 hover:bg-teal-50' },
                        { Icon: Download, title: 'PDF',                 action: () => handlePdf(order.id),                                           cls: 'hover:text-sky-600 hover:bg-sky-50' },
                        { Icon: Trash2,   title: t('delete'),           action: () => handleDelete(order.id, order.patientName),                     cls: 'hover:text-red-500 hover:bg-red-50' },
                      ].map(({ Icon, title, action, cls }) => (
                        <button key={title} title={title} onClick={action}
                          className={cn('p-1.5 rounded-lg text-slate-400 transition-all', cls)}>
                          <Icon size={14} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {t('ord_footer_count', {
              count: filtered.length === 0 ? 0 : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)}`,
              total: filtered.length
            })}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-all">
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400">…</span>
                  : <button key={p} onClick={() => setCurrentPage(p as number)}
                      className={cn('w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all',
                        safePage === p
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-200')}>
                      {p}
                    </button>
              )}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-all">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Detail drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-md bg-white border-l border-slate-200 h-full shadow-2xl flex flex-col animate-slide-in">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">{t('ord_details_title')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm font-bold text-slate-800">{selectedOrder.id}</span>
                  <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>{statusText(selectedOrder.status)}</Badge>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <User size={12} /> {t('ord_details_patient')}
                </p>
                <p className="text-sm font-bold text-slate-800">{selectedOrder.patientName}</p>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>DNI: <span className="font-semibold text-slate-700">{selectedOrder.patientIdentityCard}</span></span>
                  <span>{t('date')}: <span className="font-semibold text-slate-700">{selectedOrder.date}</span></span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <Hash size={12} className="text-teal-500" /> {t('ord_details_cid')}
                </p>
                <span className="font-mono font-bold text-sm text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg inline-block">
                  {selectedOrder.codeCID}
                </span>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                  <FileCheck size={12} className="text-sky-500" /> {t('ord_details_req')} ({selectedOrder.exams.length})
                </p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {selectedOrder.exams.map(examId => {
                    const exam = exams.find(e => e.id === examId);
                    return (
                      <div key={examId} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs">
                        <span className="font-medium text-slate-700">{exam ? t(exam.name) : examId}</span>
                        {exam?.category && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-medium uppercase shrink-0 ml-2">
                            {t(exam.category)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedOrder.observations && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{t('observations')}</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-200 leading-relaxed">
                    {selectedOrder.observations}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
                {t('ord_details_creator')}: <span className="font-semibold text-slate-600">{selectedOrder.createdBy}</span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
              <Button variant="secondary" size="sm" className="flex-1"
                onClick={() => { triggerDirectPrint(selectedOrder); setSelectedOrder(null); }}>
                <Printer size={14} /> {t('print')}
              </Button>
              <Button size="sm" className="flex-1" onClick={() => handlePdf(selectedOrder.id)}>
                <Download size={14} /> PDF
              </Button>
              <Button variant="outline" size="sm" className="flex-1"
                onClick={() => { setActiveOrderForEdit(selectedOrder); setCurrentView('new-order'); setSelectedOrder(null); }}>
                <Edit3 size={14} /> {t('edit')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

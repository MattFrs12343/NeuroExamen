import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Exam, OrderStatus } from '../types';
import {
  User, Search, Calendar, Hash, Check,
  ChevronDown, ChevronUp, ArrowLeft, X,
  FileCheck2, Building2, PlusCircle, Trash2,
  MessageSquare, ClipboardList, CheckCircle2,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { cn } from '../lib/utils';

interface CidEntry { codigo: string; descripcion: string; }
interface CustomCategory { id: string; title: string; exams: { id: string; name: string }[]; }

// ── Componentes auxiliares fuera del render para evitar re-mounts ─────────
const ExamCheckbox = ({
  id, label, checked, onToggle,
}: { id: string; label: string; checked: boolean; onToggle: (id: string) => void }) => (
  <label className={cn(
    'flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs font-medium transition-all select-none',
    checked
      ? 'bg-[#0F4C81]/8 border-[#0F4C81]/30 text-[#0F4C81]'
      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
  )}>
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onToggle(id)}
      className="mt-0.5 w-3.5 h-3.5 rounded cursor-pointer accent-[#0F4C81]"
    />
    <span className="leading-snug">{label}</span>
  </label>
);

const PanelCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden', className)}>
    {children}
  </div>
);

const PanelCardHead = ({
  icon: Icon, title, iconBg = 'bg-[#0F4C81]/8 border-[#0F4C81]/15', iconCls = 'text-[#0F4C81]', children,
}: {
  icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string; iconBg?: string; iconCls?: string; children?: React.ReactNode;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
    <div className="flex items-center gap-3">
      <div className={cn('p-2 rounded-xl border', iconBg)}>
        <Icon size={16} className={iconCls} strokeWidth={2} />
      </div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
    </div>
    {children}
  </div>
);

export const NewOrder: React.FC = () => {
  const { t } = useTranslation();
  const {
    patients, exams, addOrder, updateOrder, addPatient,
    setCurrentView, activeOrderForEdit, setActiveOrderForEdit,
    triggerDirectPrint, currentUser,
  } = useApp();

  const isEdit = !!activeOrderForEdit;

  const [patientId,        setPatientId]        = useState('');
  const [orderDate,        setOrderDate]        = useState('');
  const [codeCID,          setCodeCID]          = useState('');
  const [clinicName,       setClinicName]       = useState('');
  const [observations,     setObservations]     = useState('');
  const [selectedExams,    setSelectedExams]    = useState<string[]>([]);
  const [examDescriptions, setExamDescriptions] = useState<Record<string, string>>({});
  const [orderStatus,      setOrderStatus]      = useState<OrderStatus>('Concluido');
  const [patQuery,         setPatQuery]         = useState('');
  const [showPatDrop,      setShowPatDrop]      = useState(false);
  const [examQuery,        setExamQuery]        = useState('');
  const [expanded,         setExpanded]         = useState<Record<string, boolean>>({ cat_eeg: true });
  const [customCats,       setCustomCats]       = useState<CustomCategory[]>([]);
  const [newCatTitle,      setNewCatTitle]      = useState('');
  const [addingCat,        setAddingCat]        = useState(false);
  const [newExamNames,     setNewExamNames]     = useState<Record<string, string>>({});

  // CID-10
  const [cidList,     setCidList]     = useState<CidEntry[]>([]);
  const [cidQuery,    setCidQuery]    = useState('');
  const [showCidDrop, setShowCidDrop] = useState(false);
  const cidRef    = useRef<HTMLDivElement>(null);
  const cidLoaded = useRef(false);

  const loadCid = () => {
    if (cidLoaded.current) return;
    cidLoaded.current = true;
    fetch('/cid10.json').then(r => r.json()).then(d => setCidList(d)).catch(() => {});
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCidQuery(codeCID);
      setShowCidDrop(codeCID.trim().length >= 2);
    }, 300);
    return () => clearTimeout(timer);
  }, [codeCID]);

  const cidSuggestions = useMemo(() => {
    const q = cidQuery.trim().toUpperCase();
    if (q.length < 2 || !cidList.length) return [];
    return cidList.filter(e => e.codigo.startsWith(q) || e.descripcion.toUpperCase().includes(q)).slice(0, 40);
  }, [cidQuery, cidList]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (cidRef.current && !cidRef.current.contains(e.target as Node)) setShowCidDrop(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Prefill en modo edición
  useEffect(() => {
    if (activeOrderForEdit) {
      setPatientId(activeOrderForEdit.patientId);
      const p = patients.find(p => p.id === activeOrderForEdit.patientId);
      if (p) setPatQuery(p.name);
      setOrderDate(activeOrderForEdit.date);
      setCodeCID(activeOrderForEdit.codeCID);
      setClinicName(activeOrderForEdit.clinicName || '');
      setObservations(activeOrderForEdit.observations || '');
      setSelectedExams(activeOrderForEdit.exams);
      setExamDescriptions(activeOrderForEdit.examDescriptions || {});
      setOrderStatus(activeOrderForEdit.status);
      const loaded = activeOrderForEdit.customExams || {};
      const map: Record<string, CustomCategory> = {};
      Object.keys(loaded).forEach(eid => {
        const info = loaded[eid];
        if (!map[info.category]) map[info.category] = { id: info.category, title: info.categoryTitle || info.category, exams: [] };
        map[info.category].exams.push({ id: info.id, name: info.name });
      });
      setCustomCats(Object.values(map));
    } else {
      const now = new Date();
      setOrderDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setOrderStatus('Concluido');
      setCustomCats([]);
    }
  }, [activeOrderForEdit, patients]);

  const examsByCategory = useMemo(() => {
    const g: Record<string, Exam[]> = {};
    exams.forEach(e => { if (!g[e.category]) g[e.category] = []; g[e.category].push(e); });
    return g;
  }, [exams]);

  const filteredPatients = useMemo(() => {
    if (!patQuery.trim()) return [];
    const q = patQuery.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || p.identityCard.includes(q));
  }, [patients, patQuery]);

  const searchedExams = useMemo(() => {
    if (!examQuery.trim()) return [];
    const q = examQuery.toLowerCase();
    return exams.filter(e => t(e.name).toLowerCase().includes(q) || t(e.category).toLowerCase().includes(q));
  }, [exams, examQuery, t]);

  const selectedPatient  = patients.find(p => p.id === patientId);
  const toggleExam       = (id: string) => setSelectedExams(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleCat        = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const addCategory = () => {
    const title = newCatTitle.trim(); if (!title) return;
    const id = `custom-cat-${Date.now()}`;
    setCustomCats(p => [...p, { id, title, exams: [] }]);
    setExpanded(p => ({ ...p, [id]: true }));
    setNewCatTitle(''); setAddingCat(false);
  };
  const removeCategory = (id: string) => {
    const cat = customCats.find(c => c.id === id);
    if (cat) setSelectedExams(p => p.filter(x => !cat.exams.map(e => e.id).includes(x)));
    setCustomCats(p => p.filter(c => c.id !== id));
  };
  const addExamToCat = (catId: string) => {
    const name = (newExamNames[catId] || '').trim(); if (!name) return;
    const eid = `custom-exam-${Date.now()}`;
    setCustomCats(p => p.map(c => c.id === catId ? { ...c, exams: [...c.exams, { id: eid, name }] } : c));
    setNewExamNames(p => ({ ...p, [catId]: '' }));
  };
  const removeExamFromCat = (catId: string, eid: string) => {
    setCustomCats(p => p.map(c => c.id === catId ? { ...c, exams: c.exams.filter(e => e.id !== eid) } : c));
    setSelectedExams(p => p.filter(x => x !== eid));
  };

  const handleSave = async (print: boolean) => {
    if (!patQuery.trim())      { alert(t('new_order_validation_pat'));   return; }
    if (!orderDate)            { alert(t('new_order_validation_date'));  return; }
    if (!selectedExams.length) { alert(t('new_order_validation_exams')); return; }

    let fPid = patientId;
    if (!fPid) {
      const exact = patients.find(p => p.name.toLowerCase() === patQuery.toLowerCase());
      if (exact) { fPid = exact.id; }
      else {
        try {
          const created = await addPatient({ name: patQuery.trim(), identityCard: `NA-${Date.now()}` });
          fPid = created.id;
        } catch (e: any) { alert(t('save_error_msg', { message: e.message })); return; }
      }
    }

    const customRecord: Record<string, { id: string; name: string; category: string; categoryTitle?: string }> = {};
    customCats.forEach(cat => cat.exams.forEach(ex => {
      customRecord[ex.id] = { id: ex.id, name: ex.name, category: cat.id, categoryTitle: cat.title };
    }));

    const payload = {
      patientId: fPid, date: orderDate,
      codeCID: codeCID.trim().toUpperCase(),
      clinicName: clinicName.trim() || undefined,
      observations: observations.trim() || undefined,
      status: orderStatus, exams: selectedExams,
      examDescriptions: Object.keys(examDescriptions).length ? examDescriptions : undefined,
      customExams: Object.keys(customRecord).length ? customRecord : undefined,
    };

    try {
      let saved;
      if (isEdit && activeOrderForEdit) {
        const upd = { ...activeOrderForEdit, ...payload, createdBy: currentUser?.name || activeOrderForEdit.createdBy };
        await updateOrder(upd); saved = upd; setActiveOrderForEdit(null);
      } else {
        saved = await addOrder(payload);
      }
      if (print) triggerDirectPrint(saved);
      else alert(isEdit ? t('new_order_success_edit') : t('new_order_success'));
      setCurrentView('orders');
    } catch (e: any) { alert(t('save_error_msg', { message: e.message })); }
  };

  const handleCancel = () => { if (isEdit) setActiveOrderForEdit(null); setCurrentView('orders'); };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCancel}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isEdit ? t('new_order_edit_title') : t('new_order_title')}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Bloque 1: Datos del paciente ─────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={User} title={t('new_order_sec_patient')} />
            <div className="p-6 space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Búsqueda paciente */}
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('pat_col_name')} *</label>
                  <div className="relative">
                    <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      className="pl-10 pr-8 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                      placeholder={t('new_order_pat_search')}
                      value={patQuery}
                      onChange={e => { setPatQuery(e.target.value); setPatientId(''); setShowPatDrop(true); }}
                      onFocus={() => { if (patQuery.trim()) setShowPatDrop(true); }}
                      onBlur={() => setTimeout(() => setShowPatDrop(false), 150)}
                      autoComplete="off"
                    />
                    {patQuery && (
                      <button type="button"
                        onMouseDown={e => { e.preventDefault(); setPatQuery(''); setPatientId(''); setShowPatDrop(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {showPatDrop && patQuery.trim() && filteredPatients.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-premium-lg z-50 overflow-hidden">
                      <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                        {t('new_order_smart_search_title')}
                      </p>
                      {filteredPatients.map(p => (
                        <button key={p.id} type="button"
                          onMouseDown={e => { e.preventDefault(); setPatientId(p.id); setPatQuery(p.name); setShowPatDrop(false); }}
                          className="flex items-center gap-3 text-left w-full px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                          <div className="w-8 h-8 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-xs font-bold shrink-0">
                            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-400">
                              {p.identityCard !== 'N/A' ? `DNI: ${p.identityCard}` : ''}
                              {p.age ? ` · ${p.age} ${t('years')}` : ''}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {patientId && selectedPatient && (
                    <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      {selectedPatient.name} — DNI: {selectedPatient.identityCard}
                    </div>
                  )}
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('new_order_date_label')} *</label>
                  <div className="relative">
                    <Calendar size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input type="date"
                      className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                      value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Estado */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('status')} *</label>
                  <select
                    value={orderStatus}
                    onChange={e => setOrderStatus(e.target.value as OrderStatus)}
                    className="flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]/50 focus:bg-white cursor-pointer transition-all"
                  >
                    <option value="Concluido">{t('status_completed')}</option>
                    <option value="Pendiente">{t('status_pending')}</option>
                    <option value="Cancelado">{t('status_cancelled')}</option>
                  </select>
                </div>

                {/* CID-10 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('new_order_cid')}</label>
                  <div className="relative" ref={cidRef}>
                    <Hash size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                    <Input
                      className="pl-10 pr-8 h-11 font-mono uppercase border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                      placeholder="Ej: G40.9"
                      value={codeCID}
                      onChange={e => { setCodeCID(e.target.value); loadCid(); }}
                      onFocus={() => { loadCid(); if (codeCID.trim().length >= 2) setShowCidDrop(true); }}
                      autoComplete="off"
                    />
                    {codeCID && (
                      <button type="button"
                        onClick={() => { setCodeCID(''); setCidQuery(''); setShowCidDrop(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                    {showCidDrop && cidSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-premium-lg z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                          <span>CID-10 — {cidSuggestions.length} resultado{cidSuggestions.length !== 1 ? 's' : ''}</span>
                          <button type="button" onClick={() => setShowCidDrop(false)} className="hover:text-slate-600"><X size={11} /></button>
                        </div>
                        <ul className="max-h-52 overflow-y-auto py-1">
                          {cidSuggestions.map(e => (
                            <li key={e.codigo}>
                              <button type="button"
                                onMouseDown={() => { setCodeCID(e.codigo); setCidQuery(''); setShowCidDrop(false); }}
                                className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                                <span className="font-mono font-bold text-xs text-[#0F4C81] shrink-0 w-14">{e.codigo}</span>
                                <span className="text-xs text-slate-600 leading-snug">{e.descripcion}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clínica */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Clínica / Institución <span className="text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <div className="relative">
                  <Building2 size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    placeholder="Ej: Clínica Neurológica del Sur"
                    value={clinicName} onChange={e => setClinicName(e.target.value)} />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  {t('observations')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <Textarea
                  rows={2}
                  className="border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 resize-none"
                  placeholder={t('new_order_obs_placeholder')}
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                />
              </div>
            </div>
          </PanelCard>

          {/* ── Bloque 2: Selección de exámenes ──────────────────────────── */}
          <PanelCard>
            <PanelCardHead
              icon={FileCheck2}
              title={t('new_order_sec_exams')}
              iconBg="bg-emerald-50 border-emerald-200"
              iconCls="text-emerald-600"
            >
              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  className="pl-9 h-9 text-sm border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                  placeholder={t('new_order_exam_search')}
                  value={examQuery}
                  onChange={e => setExamQuery(e.target.value)}
                />
              </div>
            </PanelCardHead>

            <div className="p-5 space-y-2">
              {/* Resultados de búsqueda */}
              {examQuery.trim() && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {t('new_order_search_results')} ({searchedExams.length})
                    </span>
                    <button onClick={() => setExamQuery('')} className="text-xs text-slate-400 hover:text-slate-600">
                      {t('new_order_close_search')}
                    </button>
                  </div>
                  {!searchedExams.length
                    ? <p className="text-xs text-slate-400 text-center py-3">{t('new_order_no_exam_match', { query: examQuery })}</p>
                    : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                        {searchedExams.map(e => (
                          <ExamCheckbox key={e.id} id={e.id} label={t(e.name)}
                            checked={selectedExams.includes(e.id)} onToggle={toggleExam} />
                        ))}
                      </div>
                    )
                  }
                </div>
              )}

              {/* Categorías acordeón */}
              {Object.keys(examsByCategory).map(cat => {
                const catExams = examsByCategory[cat];
                const sel      = catExams.filter(e => selectedExams.includes(e.id)).length;
                const isOpen   = expanded[cat] || false;
                return (
                  <div key={cat} className={cn(
                    'border rounded-xl overflow-hidden transition-all',
                    isOpen ? 'border-slate-300 shadow-sm' : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  )}>
                    <button type="button" onClick={() => toggleCat(cat)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t(cat)}</span>
                        {sel > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0F4C81] text-white rounded-full">{sel}</span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catExams.map(e => (
                            <ExamCheckbox key={e.id} id={e.id} label={t(e.name)}
                              checked={selectedExams.includes(e.id)} onToggle={toggleExam} />
                          ))}
                        </div>
                        <div>
                          <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                            <MessageSquare size={12} /> {t('custom_exam_obs_label')}
                          </Label>
                          <Textarea rows={2}
                            className="mt-1.5 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 resize-none"
                            placeholder={t('custom_exam_obs_placeholder')}
                            value={examDescriptions[cat] || ''}
                            onChange={e => setExamDescriptions(p => ({ ...p, [cat]: e.target.value }))} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Categorías personalizadas */}
              {customCats.map(cat => {
                const sel    = cat.exams.filter(e => selectedExams.includes(e.id)).length;
                const isOpen = expanded[cat.id] || false;
                return (
                  <div key={cat.id} className={cn(
                    'border rounded-xl overflow-hidden transition-all',
                    isOpen ? 'border-[#0F4C81]/30 shadow-sm' : 'border-[#0F4C81]/15 bg-[#0F4C81]/3 hover:bg-[#0F4C81]/5'
                  )}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <button type="button" onClick={() => toggleCat(cat.id)} className="flex items-center gap-2.5 flex-1 text-left">
                        <span className="text-xs font-bold text-[#0F4C81] uppercase tracking-wide">{cat.title}</span>
                        {sel > 0 && <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0F4C81] text-white rounded-full">{sel}</span>}
                        <span className="text-[9px] font-bold text-[#0F4C81]/50 border border-[#0F4C81]/20 px-1.5 py-0.5 rounded uppercase">{t('custom_cat_badge')}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => removeCategory(cat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title={t('custom_cat_delete_title')}>
                          <Trash2 size={13} />
                        </button>
                        <button type="button" onClick={() => toggleCat(cat.id)} className="text-slate-400 p-1">
                          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t border-[#0F4C81]/10 space-y-3 animate-fade-in">
                        {cat.exams.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cat.exams.map(e => (
                              <div key={e.id} className={cn(
                                'flex items-start gap-2 p-3 rounded-xl border text-xs font-medium transition-all',
                                selectedExams.includes(e.id)
                                  ? 'bg-[#0F4C81]/8 border-[#0F4C81]/30 text-[#0F4C81]'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              )}>
                                <input type="checkbox" checked={selectedExams.includes(e.id)}
                                  onChange={() => toggleExam(e.id)}
                                  className="mt-0.5 w-3.5 h-3.5 rounded accent-[#0F4C81] cursor-pointer" />
                                <span className="flex-1 leading-snug">{e.name}</span>
                                <button type="button" onClick={() => removeExamFromCat(cat.id, e.id)}
                                  className="text-slate-300 hover:text-red-500 shrink-0 transition-colors" title={t('custom_exam_delete_title')}>
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            className="h-9 text-sm border-slate-200 bg-slate-50/50 focus:bg-white"
                            placeholder={t('custom_exam_placeholder')}
                            value={newExamNames[cat.id] || ''}
                            onChange={e => setNewExamNames(p => ({ ...p, [cat.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExamToCat(cat.id); } }}
                          />
                          <button type="button" onClick={() => addExamToCat(cat.id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-xs font-bold rounded-xl transition-colors shrink-0">
                            <PlusCircle size={13} /> {t('custom_exam_add_btn')}
                          </button>
                        </div>
                        <div>
                          <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mt-1">
                            <MessageSquare size={12} /> {t('custom_exam_obs_label')}
                          </Label>
                          <Textarea rows={2}
                            className="mt-1.5 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 resize-none"
                            placeholder={t('custom_exam_obs_placeholder')}
                            value={examDescriptions[cat.id] || ''}
                            onChange={e => setExamDescriptions(p => ({ ...p, [cat.id]: e.target.value }))} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Añadir categoría personalizada */}
              {addingCat ? (
                <div className="flex gap-2 p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                  <Input
                    autoFocus
                    className="h-9 text-sm border-slate-200 bg-white"
                    placeholder={t('custom_cat_placeholder')}
                    value={newCatTitle}
                    onChange={e => setNewCatTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } if (e.key === 'Escape') setAddingCat(false); }}
                  />
                  <button type="button" onClick={addCategory}
                    className="px-3 py-2 bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-xs font-bold rounded-xl transition-colors shrink-0">
                    {t('custom_cat_create')}
                  </button>
                  <button type="button" onClick={() => { setAddingCat(false); setNewCatTitle(''); }}
                    className="px-3 py-2 border border-slate-200 text-slate-500 text-xs font-medium rounded-xl hover:bg-slate-100 transition-colors shrink-0">
                    {t('custom_cat_cancel')}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingCat(true)}
                  className="flex items-center gap-2 w-full px-4 py-3 border border-dashed border-slate-300 rounded-xl text-sm font-medium text-slate-500 hover:border-[#0F4C81]/40 hover:text-[#0F4C81] hover:bg-[#0F4C81]/3 transition-all">
                  <PlusCircle size={16} />
                  {t('custom_cat_add_btn')}
                </button>
              )}
            </div>
          </PanelCard>
        </div>

        {/* ── Columna derecha — Resumen sticky ─────────────────────────── */}
        <div className="lg:col-span-1 lg:sticky lg:top-20 space-y-4">

          {/* Panel resumen */}
          <PanelCard>
            <PanelCardHead icon={ClipboardList} title={t('new_order_sec_summary')} />
            <div className="p-5 space-y-4">

              {/* Paciente */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('pat_col_name')}</p>
                {patQuery.trim() ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-xs font-bold shrink-0">
                      {patQuery.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{patQuery}</p>
                      {patientId && selectedPatient && (
                        <p className="text-xs text-slate-400">{selectedPatient.identityCard}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">{t('new_order_no_patient')}</p>
                )}
              </div>

              {/* Fecha y estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('date')}</p>
                  <p className="text-sm font-semibold text-slate-900">{orderDate || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('status')}</p>
                  <p className={cn('text-sm font-semibold',
                    orderStatus === 'Concluido' ? 'text-emerald-600' :
                    orderStatus === 'Pendiente' ? 'text-amber-600' : 'text-slate-500'
                  )}>
                    {orderStatus === 'Concluido' ? t('status_completed') :
                     orderStatus === 'Pendiente' ? t('status_pending') : t('status_cancelled')}
                  </p>
                </div>
              </div>

              {/* CID */}
              {codeCID && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CID</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#06B6D4]/8 border border-[#06B6D4]/15">
                    <Hash size={11} className="text-[#06B6D4]" />
                    <span className="font-mono text-xs font-bold text-[#06B6D4]">{codeCID.toUpperCase()}</span>
                  </span>
                </div>
              )}

              {/* Exámenes seleccionados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('new_order_selected_exams_label')}</p>
                  {selectedExams.length > 0 && (
                    <span className="text-[10px] font-bold text-white bg-[#0F4C81] px-2 py-0.5 rounded-full">{selectedExams.length}</span>
                  )}
                </div>
                {selectedExams.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">{t('new_order_no_exams')}</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {selectedExams.map(eid => {
                      const exam = exams.find(e => e.id === eid);
                      const customExam = customCats.flatMap(c => c.exams).find(e => e.id === eid);
                      const label = exam ? t(exam.name) : customExam?.name ?? eid;
                      return (
                        <div key={eid} className="flex items-start gap-2 group">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0F4C81] mt-1.5 shrink-0" />
                          <p className="text-xs text-slate-700 leading-snug flex-1">{label}</p>
                          <button type="button" onClick={() => toggleExam(eid)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </PanelCard>

          {/* Botones de acción */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all"
            >
              <Check size={17} strokeWidth={2.5} />
              {t('save')}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all"
            >
              {t('save_and_print')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center justify-center w-full h-10 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

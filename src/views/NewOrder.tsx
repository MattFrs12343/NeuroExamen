import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Exam, OrderStatus } from '../types';
import {
  User, Search, Calendar, FileText, Hash, Check,
  ChevronDown, ChevronUp, Info, ArrowLeft, X,
  FileCheck2, Printer, Building2, PlusCircle, Trash2, MessageSquare,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { cn } from '../lib/utils';

interface CidEntry { codigo: string; descripcion: string; }
interface CustomCategory { id: string; title: string; exams: { id: string; name: string }[]; }

// ── Componentes auxiliares fuera del render ───────────────────────────────
const ExamCheckbox = ({ id, label, isCustom = false, checked, onToggle }: { 
  id: string; 
  label: string; 
  isCustom?: boolean;
  checked: boolean;
  onToggle: (id: string) => void;
}) => {
  return (
    <label className={cn(
      'flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer text-xs font-medium transition-all select-none',
      checked
        ? isCustom
          ? 'bg-violet-50 border-violet-300 text-violet-800'
          : 'bg-teal-50 border-teal-300 text-teal-800'
        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
    )}>
      <input
        type="checkbox" 
        checked={checked} 
        onChange={() => onToggle(id)}
        className={cn('mt-0.5 w-3.5 h-3.5 rounded cursor-pointer',
          isCustom ? 'accent-violet-600' : 'accent-teal-600')}
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
};

const Section = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white border border-slate-200 rounded-xl shadow-sm', className)}>
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, iconCls = 'text-sky-600', children }: {
  icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string; iconCls?: string; children?: React.ReactNode;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200">
    <div className="flex items-center gap-2">
      <Icon size={16} className={iconCls} strokeWidth={2} />
      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
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

  // ── Form state ───────────────────────────────────────────────────────────
  const [patientId,        setPatientId]        = useState('');
  const [orderDate,        setOrderDate]        = useState('');
  const [codeCID,          setCodeCID]          = useState('');
  const [clinicName,       setClinicName]       = useState('');
  const [observations,     setObservations]     = useState('');
  const [selectedExams,    setSelectedExams]    = useState<string[]>([]);
  const [examDescriptions, setExamDescriptions] = useState<Record<string, string>>({});
  const [orderStatus,      setOrderStatus]      = useState<OrderStatus>('Concluido');

  const [patQuery,    setPatQuery]    = useState('');
  const [showPatDrop, setShowPatDrop] = useState(false);
  const [examQuery,   setExamQuery]   = useState('');
  const [expanded,    setExpanded]    = useState<Record<string, boolean>>({ cat_eeg: true });

  const [customCats,   setCustomCats]   = useState<CustomCategory[]>([]);
  const [newCatTitle,  setNewCatTitle]  = useState('');
  const [addingCat,    setAddingCat]    = useState(false);
  const [newExamNames, setNewExamNames] = useState<Record<string, string>>({});

  // ── CID-10 ───────────────────────────────────────────────────────────────
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

  // Debounce: actualiza la query de búsqueda 300ms después de que el usuario
  // deje de escribir — NO toca codeCID, así el input nunca se interrumpe
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
    return cidList.filter(e =>
      e.codigo.startsWith(q) || e.descripcion.toUpperCase().includes(q)
    ).slice(0, 40);
  }, [cidQuery, cidList]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (cidRef.current && !cidRef.current.contains(e.target as Node)) setShowCidDrop(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Edit prefill ──────────────────────────────────────────────────────────
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

  // ── Derived state ─────────────────────────────────────────────────────────
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

  const selectedPatient = patients.find(p => p.id === patientId);

  const toggleExam = (id: string) => setSelectedExams(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleCat  = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

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

  // ── Save ──────────────────────────────────────────────────────────────────
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
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <button onClick={handleCancel}
          className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all">
          <ArrowLeft size={15} />
        </button>
        <h1 className="text-xl font-bold text-slate-900">
          {isEdit ? t('new_order_edit_title') : t('new_order_title')}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Left column (2/3) ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Block 1: Patient */}
          <Section>
            <SectionHeader icon={User} title={t('new_order_sec_patient')} />
            <div className="p-6 space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Patient search */}
                <div className="sm:col-span-2 relative">
                  <Label>{t('pat_col_name')} *</Label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      className="pl-8 pr-7 border-slate-200 bg-slate-50 focus:bg-white"
                      placeholder={t('new_order_pat_search')}
                      value={patQuery}
                      onChange={e => { setPatQuery(e.target.value); setPatientId(''); setShowPatDrop(true); }}
                      onFocus={() => { if (patQuery.trim()) setShowPatDrop(true); }}
                      onBlur={() => setTimeout(() => setShowPatDrop(false), 150)}
                      autoComplete="off"
                    />
                    {patQuery && (
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); setPatQuery(''); setPatientId(''); setShowPatDrop(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown */}
                  {showPatDrop && patQuery.trim() && filteredPatients.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                      <p className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 border-b border-slate-200">
                        {t('new_order_smart_search_title')}
                      </p>
                      {filteredPatients.map(p => (
                        <button key={p.id} type="button"
                          onMouseDown={e => { e.preventDefault(); setPatientId(p.id); setPatQuery(p.name); setShowPatDrop(false); }}
                          className="flex flex-col text-left w-full px-3 py-2.5 hover:bg-sky-50 transition-colors border-b border-slate-100 last:border-0">
                          <span className="text-sm font-semibold text-slate-800">{p.name}</span>
                          <span className="text-[11px] text-slate-400">
                            {p.identityCard !== 'N/A' ? `DNI: ${p.identityCard}` : ''}
                            {p.age ? ` · ${p.age} ${t('years')}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {patientId && selectedPatient && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-teal-700 font-semibold bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md">
                      <Check size={12} strokeWidth={3} />
                      {t('pat_select_feedback', { name: selectedPatient.name, dni: selectedPatient.identityCard })}
                    </div>
                  )}
                </div>

                {/* Date */}
                <div>
                  <Label>{t('new_order_date_label')} *</Label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input type="date" className="pl-8 border-slate-200 bg-slate-50 focus:bg-white"
                      value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <Label>{t('status')} *</Label>
                  <select
                    value={orderStatus}
                    onChange={e => setOrderStatus(e.target.value as OrderStatus)}
                    className="flex h-9 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:bg-white cursor-pointer transition-colors"
                  >
                    <option value="Concluido">{t('status_completed')}</option>
                    <option value="Pendiente">{t('status_pending')}</option>
                    <option value="Cancelado">{t('status_cancelled')}</option>
                  </select>
                </div>

                {/* CID-10 */}
                <div>
                  <Label>{t('new_order_cid')}</Label>
                  <div className="relative" ref={cidRef}>
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                    <Input
                      className="pl-8 pr-7 font-mono uppercase border-slate-200 bg-slate-50 focus:bg-white"
                      placeholder="Ej: G40.9"
                      value={codeCID}
                      onChange={e => { setCodeCID(e.target.value); loadCid(); }}
                      onFocus={() => { loadCid(); if (codeCID.trim().length >= 2) setShowCidDrop(true); }}
                      autoComplete="off"
                    />
                    {codeCID && (
                      <button type="button" onClick={() => { setCodeCID(''); setCidQuery(''); setShowCidDrop(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={13} />
                      </button>
                    )}
                    {showCidDrop && cidSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase border-b border-slate-200 bg-slate-50">
                          <span>CID-10 — {cidSuggestions.length} resultado{cidSuggestions.length !== 1 ? 's' : ''}</span>
                          <button type="button" onClick={() => setShowCidDrop(false)} className="hover:text-slate-600"><X size={11} /></button>
                        </div>
                        <ul className="max-h-52 overflow-y-auto py-1">
                          {cidSuggestions.map(e => (
                            <li key={e.codigo}>
                              <button type="button" onMouseDown={() => { setCodeCID(e.codigo); setCidQuery(''); setShowCidDrop(false); }}
                                className="w-full flex items-start gap-3 px-3 py-2 hover:bg-sky-50 transition-colors text-left">
                                <span className="font-mono font-bold text-xs text-sky-700 shrink-0 w-12">{e.codigo}</span>
                                <span className="text-xs text-slate-700 leading-snug">{e.descripcion}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Clinic */}
              <div>
                <Label>Clínica / Institución ({t('optional')})</Label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input className="pl-8 border-slate-200 bg-slate-50 focus:bg-white"
                    placeholder="Ej: Clínica Neurológica del Sur"
                    value={clinicName} onChange={e => setClinicName(e.target.value)} />
                </div>
              </div>

              {/* Observations */}
              <div>
                <Label>{t('observations')} ({t('optional')})</Label>
                <Input className="border-slate-200 bg-slate-50 focus:bg-white"
                  placeholder={t('new_order_obs_placeholder')}
                  value={observations} onChange={e => setObservations(e.target.value)} />
              </div>
            </div>
          </Section>

          {/* Block 2: Exams */}
          <Section>
            <SectionHeader icon={FileCheck2} title={t('new_order_sec_exams')} iconCls="text-teal-600">
              <div className="relative w-full sm:w-56">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input className="pl-8 h-8 text-xs border-slate-200 bg-slate-50 focus:bg-white"
                  placeholder={t('new_order_exam_search')}
                  value={examQuery} onChange={e => setExamQuery(e.target.value)} />
              </div>
            </SectionHeader>
            <div className="p-5 space-y-2">

              {/* Search results */}
              {examQuery.trim() && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-semibold text-teal-700">
                    <span>{t('new_order_search_results')} ({searchedExams.length})</span>
                    <button onClick={() => setExamQuery('')} className="text-slate-400 hover:text-slate-600 text-[11px]">
                      {t('new_order_close_search')}
                    </button>
                  </div>
                  {!searchedExams.length
                    ? <p className="text-xs text-slate-400 text-center py-2">{t('new_order_no_exam_match', { query: examQuery })}</p>
                    : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                        {searchedExams.map(e => (
                          <ExamCheckbox 
                            key={e.id} 
                            id={e.id} 
                            label={t(e.name)} 
                            checked={selectedExams.includes(e.id)}
                            onToggle={toggleExam}
                          />
                        ))}
                      </div>
                    )
                  }
                </div>
              )}

              {/* Category accordion */}
              {Object.keys(examsByCategory).map(cat => {
                const catExams = examsByCategory[cat];
                const sel      = catExams.filter(e => selectedExams.includes(e.id)).length;
                const isOpen   = expanded[cat] || false;
                return (
                  <div key={cat} className={cn(
                    'border rounded-xl overflow-hidden transition-all',
                    isOpen ? 'border-slate-300 bg-white shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  )}>
                    <button type="button" onClick={() => toggleCat(cat)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t(cat)}</span>
                        {sel > 0 && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-600 text-white rounded-full">{sel}</span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-200 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catExams.map(e => (
                            <ExamCheckbox 
                              key={e.id} 
                              id={e.id} 
                              label={t(e.name)} 
                              checked={selectedExams.includes(e.id)}
                              onToggle={toggleExam}
                            />
                          ))}
                        </div>
                        <div>
                          <Label className="flex items-center gap-1.5">
                            <MessageSquare size={11} /> {t('custom_exam_obs_label')}
                          </Label>
                          <Textarea rows={2}
                            className="border-slate-200 bg-slate-50 focus:bg-white"
                            placeholder={t('custom_exam_obs_placeholder')}
                            value={examDescriptions[cat] || ''}
                            onChange={e => setExamDescriptions(p => ({ ...p, [cat]: e.target.value }))} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Custom categories */}
              {customCats.map(cat => {
                const sel    = cat.exams.filter(e => selectedExams.includes(e.id)).length;
                const isOpen = expanded[cat.id] || false;
                return (
                  <div key={cat.id} className={cn(
                    'border rounded-xl overflow-hidden transition-all',
                    isOpen ? 'border-violet-300 bg-white shadow-sm' : 'border-violet-200 bg-violet-50/40 hover:bg-violet-50'
                  )}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <button type="button" onClick={() => toggleCat(cat.id)} className="flex items-center gap-2.5 flex-1 text-left">
                        <span className="text-xs font-bold text-violet-800 uppercase tracking-wide">{cat.title}</span>
                        {sel > 0 && <span className="px-2 py-0.5 text-[10px] font-bold bg-violet-600 text-white rounded-full">{sel}</span>}
                        <span className="text-[9px] font-bold text-violet-400 border border-violet-200 px-1.5 py-0.5 rounded uppercase">{t('custom_cat_badge')}</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => removeCategory(cat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title={t('custom_cat_delete_title')}>
                          <Trash2 size={13} />
                        </button>
                        <button type="button" onClick={() => toggleCat(cat.id)} className="text-slate-400">
                          {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t border-violet-100 space-y-3 animate-fade-in">
                        {cat.exams.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {cat.exams.map(e => (
                              <div key={e.id} className={cn(
                                'flex items-start gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all',
                                selectedExams.includes(e.id)
                                  ? 'bg-violet-50 border-violet-300 text-violet-800'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              )}>
                                <input type="checkbox" checked={selectedExams.includes(e.id)}
                                  onChange={() => toggleExam(e.id)}
                                  className="mt-0.5 w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer" />
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
                          <Input className="h-8 text-xs border-slate-200 bg-slate-50 focus:bg-white"
                            placeholder={t('custom_exam_placeholder')}
                            value={newExamNames[cat.id] || ''}
                            onChange={e => setNewExamNames(p => ({ ...p, [cat.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExamToCat(cat.id); } }} />
                          <button type="button" onClick={() => addExamToCat(cat.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0">
                            <PlusCircle size={12} /> {t('custom_exam_add_btn')}
                          </button>
                        </div>
                        <div>
                          <Label className="flex items-center gap-1.5 mt-1">
                            <MessageSquare size={11} /> {t('custom_exam_obs_label')}
                          </Label>
                          <Textarea rows={2}
                            className="border-slate-200 bg-slate-50 focus:bg-white"
                            placeholder={t('custom_exam_obs_placeholder')}
                            value={examDescriptions[cat.id] || ''}
                            onChange={e => setExamDescriptions(p => ({ ...p, [cat.id]: e.target.value }))} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add category */}
              {addingCat ? (
                <div className="border border-dashed border-violet-300 rounded-xl p-4 bg-violet-50/40 space-y-3">
                  <p className="text-xs font-bold text-violet-700">{t('custom_cat_new_title')}</p>
                  <div className="flex gap-2">
                    <Input className="h-8 text-xs border-violet-200 focus:border-violet-400 bg-white" autoFocus
                      placeholder={t('custom_cat_placeholder')} value={newCatTitle}
                      onChange={e => setNewCatTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }} />
                    <button type="button" onClick={addCategory}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg shrink-0 transition-colors">
                      {t('custom_cat_create')}
                    </button>
                    <button type="button" onClick={() => { setAddingCat(false); setNewCatTitle(''); }}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 text-xs font-bold rounded-lg shrink-0 transition-colors">
                      {t('custom_cat_cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingCat(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-slate-300 hover:border-violet-300 rounded-xl text-xs font-semibold text-slate-400 hover:text-violet-600 hover:bg-violet-50/40 transition-all">
                  <PlusCircle size={14} /> {t('custom_cat_add_btn')}
                </button>
              )}
            </div>
          </Section>
        </div>

        {/* ── Right column — summary sticky ──────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <Section>
            <SectionHeader icon={FileText} title={t('new_order_sec_summary')} />
            <div className="p-5 space-y-4">

              {/* Patient */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{t('pat_col_name')}</p>
                {patQuery.trim() ? (
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <p className="text-sm font-semibold text-slate-800 truncate">{patQuery.trim()}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedPatient ? `DNI: ${selectedPatient.identityCard}` : (
                        <span className="text-teal-600 font-semibold">({t('new_patient')})</span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-500 font-medium">
                    <Info size={12} /> {t('new_order_no_patient')}
                  </div>
                )}
              </div>

              {/* CID */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{t('print_cid')}</p>
                {codeCID
                  ? <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg inline-block">{codeCID.toUpperCase()}</span>
                  : <span className="text-xs text-slate-400 italic">{t('new_order_no_cid')}</span>
                }
              </div>

              {/* Date */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{t('new_order_date_label')}</p>
                <span className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg inline-block">
                  {orderDate || t('new_order_select_date')}
                </span>
              </div>

              {/* Exams */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t('new_order_selected_exams_label')}</p>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                    {selectedExams.length}
                  </span>
                </div>
                {!selectedExams.length ? (
                  <div className="border border-dashed border-slate-200 rounded-lg p-4 text-center text-xs text-slate-400 italic">
                    {t('new_order_no_exams')}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedExams.map(eid => {
                      const exam   = exams.find(e => e.id === eid);
                      const custom = !exam ? customCats.flatMap(c => c.exams).find(e => e.id === eid) : null;
                      const label  = exam ? t(exam.name) : custom?.name ?? eid;
                      return (
                        <div key={eid} className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                          <span className="flex-1 truncate">{label}</span>
                          <button onClick={() => toggleExam(eid)}
                            className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <button type="button" onClick={() => handleSave(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                  <Printer size={15} /> {t('save_and_print')}
                </button>
                <button type="button" onClick={() => handleSave(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98]">
                  {t('save_no_print')}
                </button>
                <button type="button" onClick={handleCancel}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-all">
                  {t('cancel')}
                </button>
              </div>
            </div>
          </Section>
        </div>

      </div>
    </div>
  );
};

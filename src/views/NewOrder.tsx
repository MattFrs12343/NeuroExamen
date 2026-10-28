import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Exam, OrderPrintMode, OrderStatus } from '../types';
import {
  User, Search, Calendar, Hash, Check,
  ChevronDown, ChevronUp, ArrowLeft, X,
  FileCheck2, PlusCircle,
  MessageSquare, ClipboardList, CheckCircle2, FileSignature,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RichTextField } from '../components/ui/rich-text-field';
import { ExpandableRichField } from '../components/ExpandableRichField';
import { isRichTextEmpty } from '../lib/richText';
import { ClinicProfileField } from '../components/ClinicProfileField';
import { cn, findPatientsByExactName, getErrorMessage, hasIdentity } from '../lib/utils';
import { EditPatientNameButton } from '../components/EditPatientNameButton';
import { OrderPrintModeModal } from '../components/OrderPrintModeModal';
import { SPECIALIZED_EXAM_IDS } from '../data/specializedExamDocs';
import { findClinicProfile } from '../lib/clinic';

interface CidEntry { codigo: string; descripcion: string; }
interface LegacyCustomExam { id: string; name: string; category: string; categoryTitle?: string; }

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
  <div className={cn('bg-white rounded-2xl border border-slate-200/80 shadow-premium', className)}>
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
    triggerDirectPrint, triggerSignAndPrint, currentUser,
    lastClinicName, setLastClinicName, clinicProfiles,
    customExamsCatalog, addCustomExam, deleteCustomExam,
    getLastKnownPatientPhone,
  } = useApp();

  const isEdit = !!activeOrderForEdit;

  const [patientId,        setPatientId]        = useState('');
  const [patientPhone,     setPatientPhone]     = useState('');
  const [orderDate,        setOrderDate]        = useState('');
  const [codeCID,          setCodeCID]          = useState('');
  const [clinicName,       setClinicName]       = useState(lastClinicName);
  const [observations,     setObservations]     = useState('');
  const [selectedExams,    setSelectedExams]    = useState<string[]>([]);
  const [examDescriptions, setExamDescriptions] = useState<Record<string, string>>({});
  const [orderStatus,      setOrderStatus]      = useState<OrderStatus>('Concluido');
  const [patQuery,         setPatQuery]         = useState('');
  const [showPatDrop,      setShowPatDrop]      = useState(false);
  const [examQuery,        setExamQuery]        = useState('');
  const [expanded,         setExpanded]         = useState<Record<string, boolean>>({ cat_eeg: true });
  const [legacyCustomExams, setLegacyCustomExams] = useState<Record<string, LegacyCustomExam>>({});
  const [newCustomExamName, setNewCustomExamName] = useState('');
  const [printMode, setPrintMode] = useState<OrderPrintMode>('both');
  const [modeModalAction, setModeModalAction] = useState<'print' | 'sign-print' | null>(null);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the whole form from the edit target; too many fields to safely move to render-phase
      setPatientId(activeOrderForEdit.patientId);
      const p = patients.find(p => p.id === activeOrderForEdit.patientId);
      if (p) setPatQuery(p.name);
      setPatientPhone(activeOrderForEdit.patientPhone || getLastKnownPatientPhone(activeOrderForEdit.patientId));
      setOrderDate(activeOrderForEdit.date);
      setCodeCID(activeOrderForEdit.codeCID);
      setClinicName(activeOrderForEdit.clinicName || '');
      setObservations(activeOrderForEdit.observations || '');
      setSelectedExams(activeOrderForEdit.exams);
      setExamDescriptions(activeOrderForEdit.examDescriptions || {});
      setOrderStatus(activeOrderForEdit.status);
      setPrintMode(activeOrderForEdit.printMode ?? 'both');
      setLegacyCustomExams(activeOrderForEdit.customExams || {});
    } else {
      const now = new Date();
      setOrderDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setOrderStatus('Concluido');
      setLegacyCustomExams({});
      setPatientPhone('');
      setPrintMode('both');
    }
  }, [activeOrderForEdit, patients, getLastKnownPatientPhone]);

  // Derivados en vivo del perfil de la clínica seleccionada — mismo patrón
  // que NewAtestado.tsx/NewReceta.tsx (antes Pedidos sólo guardaba el
  // nombre de la clínica como texto libre, sin dirección/teléfono/CNPJ).
  const selectedClinicProfile = useMemo(
    () => findClinicProfile(clinicProfiles, clinicName),
    [clinicName, clinicProfiles]
  );
  const clinicSecretaria = selectedClinicProfile?.secretaria || '';
  const clinicSistema    = selectedClinicProfile?.sistema    || '';
  const clinicAddress    = selectedClinicProfile?.address    || '';
  const clinicPhone      = selectedClinicProfile?.phone      || '';
  const clinicCnpj       = selectedClinicProfile?.cnpj       || '';

  const handleSelectClinic = (name: string) => { setClinicName(name); setLastClinicName(name); };

  const examsByCategory = useMemo(() => {
    const g: Record<string, Exam[]> = {};
    exams.forEach(e => {
      if (e.hidden && !selectedExams.includes(e.id)) return;
      if (!g[e.category]) g[e.category] = [];
      g[e.category].push(e);
    });
    return g;
  }, [exams, selectedExams]);

  const filteredPatients = useMemo(() => {
    if (!patQuery.trim()) return [];
    const q = patQuery.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || (p.identityCard || '').includes(q));
  }, [patients, patQuery]);

  const searchedExams = useMemo(() => {
    if (!examQuery.trim()) return [];
    const q = examQuery.toLowerCase();
    return exams.filter(e =>
      (!e.hidden || selectedExams.includes(e.id)) &&
      (t(e.name).toLowerCase().includes(q) || t(e.category).toLowerCase().includes(q))
    );
  }, [exams, examQuery, t, selectedExams]);

  const selectedPatient  = patients.find(p => p.id === patientId);
  const hasSpecializedSelected = selectedExams.some(id => SPECIALIZED_EXAM_IDS.has(id));
  const toggleExam       = (id: string) => setSelectedExams(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleCat        = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const handleCreateCustomExam = async () => {
    const name = newCustomExamName.trim(); if (!name) return;
    try {
      const created = await addCustomExam(name);
      setSelectedExams(p => [...p, created.id]);
      setNewCustomExamName('');
      setExpanded(p => ({ ...p, cat_custom: true }));
    } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); }
  };
  const handleDeleteCustomExam = async (id: string) => {
    try {
      await deleteCustomExam(id);
      setSelectedExams(p => p.filter(x => x !== id));
    } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); }
  };

  const [signing, setSigning] = useState(false);

  const handleSave = async (action: 'save' | 'print' | 'sign-print', modeOverride?: OrderPrintMode) => {
    if (!patQuery.trim())      { alert(t('new_order_validation_pat'));   return; }
    if (!orderDate)            { alert(t('new_order_validation_date'));  return; }
    if (!selectedExams.length) { alert(t('new_order_validation_exams')); return; }

    const effectivePrintMode: OrderPrintMode = hasSpecializedSelected
      ? (modeOverride ?? printMode)
      : 'both';

    let fPid = patientId;
    if (!fPid) {
      const matches = findPatientsByExactName(patients, patQuery);
      if (matches.length > 1) { alert(t('patient_ambiguous_match')); return; }
      if (matches.length === 1) { fPid = matches[0].id; }
      else {
        try {
          const created = await addPatient({ name: patQuery.trim() });
          fPid = created.id;
        } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); return; }
      }
    }

    const customRecord: Record<string, { id: string; name: string; category: string; categoryTitle?: string }> = {};
    selectedExams.forEach(eid => {
      const catalogExam = customExamsCatalog.find(e => e.id === eid);
      if (catalogExam) {
        customRecord[eid] = { id: eid, name: catalogExam.name, category: 'cat_custom', categoryTitle: t('custom_exam_section_title') };
      } else if (legacyCustomExams[eid]) {
        customRecord[eid] = legacyCustomExams[eid];
      }
    });

    const payload = {
      patientId: fPid, date: orderDate,
      codeCID: codeCID.trim().toUpperCase(),
      patientPhone: patientPhone.trim() || undefined,
      clinicName: clinicName.trim() || undefined,
      clinicSecretaria: clinicSecretaria.trim() || undefined,
      clinicSistema: clinicSistema.trim() || undefined,
      clinicAddress: clinicAddress.trim() || undefined,
      clinicPhone: clinicPhone.trim() || undefined,
      clinicCnpj: clinicCnpj.trim() || undefined,
      observations: isRichTextEmpty(observations) ? undefined : observations,
      status: orderStatus, exams: selectedExams,
      examDescriptions: Object.keys(examDescriptions).length ? examDescriptions : undefined,
      customExams: Object.keys(customRecord).length ? customRecord : undefined,
      printMode: effectivePrintMode,
    };

    try {
      let saved;
      if (isEdit && activeOrderForEdit) {
        const upd = { ...activeOrderForEdit, ...payload, createdBy: currentUser?.name || activeOrderForEdit.createdBy };
        await updateOrder(upd); saved = upd; setActiveOrderForEdit(null);
      } else {
        saved = await addOrder(payload);
      }
      if (action === 'print') {
        triggerDirectPrint(saved);
      } else if (action === 'sign-print') {
        setSigning(true);
        try {
          await triggerSignAndPrint('order', saved, { printMode: effectivePrintMode });
        } catch (e) {
          alert(t('sign_pdf_error', { message: getErrorMessage(e) }));
        } finally {
          setSigning(false);
        }
      } else {
        alert(isEdit ? t('new_order_success_edit') : t('new_order_success'));
      }
      setCurrentView('orders');
    } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); }
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
                      className={`pl-10 pr-8 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 ${isEdit ? 'cursor-not-allowed text-slate-500' : ''}`}
                      placeholder={t('new_order_pat_search')}
                      value={patQuery}
                      readOnly={isEdit}
                      onChange={e => { setPatQuery(e.target.value); setPatientId(''); setShowPatDrop(true); }}
                      onFocus={() => { if (!isEdit && patQuery.trim()) setShowPatDrop(true); }}
                      onBlur={() => setTimeout(() => setShowPatDrop(false), 150)}
                      autoComplete="off"
                    />
                    {patQuery && !isEdit && (
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
                          onMouseDown={e => { e.preventDefault(); setPatientId(p.id); setPatQuery(p.name); setShowPatDrop(false); setPatientPhone(prev => prev.trim() ? prev : getLastKnownPatientPhone(p.id)); }}
                          className="flex items-center gap-3 text-left w-full px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                          <div className="w-8 h-8 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-xs font-bold shrink-0">
                            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-400">
                              {hasIdentity(p.identityCard) ? `DNI: ${p.identityCard}` : ''}
                              {p.age ? ` · ${p.age} ${t('years')}` : ''}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {patientId && selectedPatient && (
                    <>
                      <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                        <CheckCircle2 size={13} strokeWidth={2.5} />
                        {selectedPatient.name}{hasIdentity(selectedPatient.identityCard) ? ` — DNI: ${selectedPatient.identityCard}` : ''}
                      </div>
                      <EditPatientNameButton patientId={patientId} onRenamed={setPatQuery} />
                    </>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  {t('patient_phone_label')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <Input type="tel" className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                  placeholder={t('patient_phone_placeholder')}
                  value={patientPhone} onChange={e => setPatientPhone(e.target.value)} />
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
                <ClinicProfileField
                  options={clinicProfiles}
                  value={clinicName}
                  onValueChange={handleSelectClinic}
                />
                {clinicName && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-600 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('receta_clinic_preview_title')}</p>
                    {clinicSecretaria && <p>{clinicSecretaria}</p>}
                    {clinicSistema && <p>{clinicSistema}</p>}
                    {clinicAddress && <p className="whitespace-pre-line">{clinicAddress}</p>}
                    {clinicPhone && <p className="whitespace-pre-line"><strong className="font-semibold text-slate-700">Tel:</strong> {clinicPhone}</p>}
                    {clinicCnpj && <p><strong className="font-semibold text-slate-700">CNPJ:</strong> {clinicCnpj}</p>}
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  {t('observations')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <ExpandableRichField
                  value={observations}
                  onChange={setObservations}
                  placeholder={t('new_order_obs_placeholder')}
                  modalTitle={t('observations')}
                  style={{ minHeight: '58px' }}
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
                          <RichTextField
                            className="mt-1.5 border border-slate-200 bg-slate-50/50 focus-within:bg-white focus-within:border-[#0F4C81]/50 transition-colors"
                            placeholder={t('custom_exam_obs_placeholder')}
                            value={examDescriptions[cat] || ''}
                            onChange={html => setExamDescriptions(p => ({ ...p, [cat]: html }))}
                            style={{ minHeight: '58px' }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Estudios personalizados — catálogo compartido, se guarda en BD */}
              {(() => {
                const sel    = customExamsCatalog.filter(e => selectedExams.includes(e.id)).length;
                const isOpen = expanded.cat_custom || false;
                return (
                  <div className={cn(
                    'border rounded-xl overflow-hidden transition-all',
                    isOpen ? 'border-[#0F4C81]/30 shadow-sm' : 'border-[#0F4C81]/15 bg-[#0F4C81]/3 hover:bg-[#0F4C81]/5'
                  )}>
                    <button type="button" onClick={() => toggleCat('cat_custom')}
                      className="w-full flex items-center justify-between px-4 py-3 text-left">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-[#0F4C81] uppercase tracking-wide">{t('custom_exam_section_title')}</span>
                        {sel > 0 && <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0F4C81] text-white rounded-full">{sel}</span>}
                      </div>
                      {isOpen ? <ChevronUp size={15} className="text-[#0F4C81]/60" /> : <ChevronDown size={15} className="text-[#0F4C81]/60" />}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-2 border-t border-[#0F4C81]/10 space-y-3 animate-fade-in">
                        {customExamsCatalog.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {customExamsCatalog.map(e => (
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
                                <button type="button" onClick={() => handleDeleteCustomExam(e.id)}
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
                            value={newCustomExamName}
                            onChange={e => setNewCustomExamName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCustomExam(); } }}
                          />
                          <button type="button" onClick={handleCreateCustomExam}
                            className="flex items-center gap-1.5 px-3 py-2 bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-xs font-bold rounded-xl transition-colors shrink-0">
                            <PlusCircle size={13} /> {t('custom_exam_add_btn')}
                          </button>
                        </div>
                        <div>
                          <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mt-1">
                            <MessageSquare size={12} /> {t('custom_exam_obs_label')}
                          </Label>
                          <RichTextField
                            className="mt-1.5 border border-slate-200 bg-slate-50/50 focus-within:bg-white focus-within:border-[#0F4C81]/50 transition-colors"
                            placeholder={t('custom_exam_obs_placeholder')}
                            value={examDescriptions['cat_custom'] || ''}
                            onChange={html => setExamDescriptions(p => ({ ...p, cat_custom: html }))}
                            style={{ minHeight: '58px' }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </PanelCard>
        </div>

        {/* ── Columna derecha — Resumen sticky ─────────────────────────── */}
        <div className="lg:col-span-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-4">

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
                      {patientId && selectedPatient && hasIdentity(selectedPatient.identityCard) && (
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
                      const customExam = customExamsCatalog.find(e => e.id === eid);
                      const label = exam ? t(exam.name) : customExam?.name ?? legacyCustomExams[eid]?.name ?? eid;
                      return (
                        <div key={eid} className="flex items-start gap-2 group">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0F4C81] mt-1.5 shrink-0" />
                          <p className="text-xs text-slate-700 leading-snug flex-1">{label}</p>
                          <button type="button" onClick={() => toggleExam(eid)}
                            className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
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
              onClick={() => handleSave('save')}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all"
            >
              <Check size={17} strokeWidth={2.5} />
              {t('save')}
            </button>
            <button
              type="button"
              onClick={() => handleSave('print')}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all"
            >
              {t('save_and_print')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (hasSpecializedSelected) setModeModalAction('sign-print');
                else handleSave('sign-print');
              }}
              disabled={signing}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <FileSignature size={16} className={signing ? 'animate-pulse' : ''} />
              {signing ? t('sign_print_loading') : t('save_sign_print')}
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

      {modeModalAction && (
        <OrderPrintModeModal
          initialMode={printMode}
          onClose={() => setModeModalAction(null)}
          onConfirm={(mode) => {
            const action = modeModalAction;
            setPrintMode(mode);
            setModeModalAction(null);
            void handleSave(action, mode);
          }}
        />
      )}
    </div>
  );
};

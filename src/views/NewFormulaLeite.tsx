import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { FormulaLeite, SymptomEntry, ExamEntry, NutritionHistoryEntry } from '../types';
import {
  User, Search, Check, ArrowLeft, X,
  ClipboardList, CheckCircle2, Save, Building2,
  Stethoscope, FlaskConical, Scale, ClipboardCheck,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { RichTextField } from '../components/ui/rich-text-field';
import { ClinicField } from '../components/ClinicField';
import { cn, findPatientsByExactName, getErrorMessage, hasIdentity } from '../lib/utils';
import { toISOSafe, isoToBRDate } from '../lib/dates';
import { EditPatientNameButton } from '../components/EditPatientNameButton';
import { isRichTextEmpty } from '../lib/richText';
import { DOCTOR_NAME, DOCTOR_CNS, DOCTOR_CPF } from '../lib/doctor';
import {
  SYMPTOM_CATEGORY_LABELS, EXAM_CATEGORY_LABELS, FORMULA_TYPES,
  buildDefaultSymptoms, buildDefaultExams, buildDefaultNutritionHistory,
} from '../data/formulaLeiteCatalog';

interface CidEntry { codigo: string; descripcion: string; }

// Máscara de fecha: agrega "/" solo cuando el segmento se completa (2 dígitos) o
// cuando ya hay contenido adelante. No agrega ceros mientras se escribe, para no
// bloquear valores de 2 dígitos (ej: día "12"). Al salir del campo, se normaliza.
const maskBirthDate = (raw: string, hasTrailing: boolean) => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let out = day;
  if (month) out += '/' + month;
  if (year) out += '/' + year;
  if (hasTrailing && digits.length === 2) out += '/';
  if (hasTrailing && digits.length === 4) out += '/';
  return out;
};

const padSegment = (s: string) => (s && s.length === 1 ? '0' + s : s);

// Completa segmentos de 1 dígito con su cero y agrega "/" cuando el segmento quedó
// completo (ej: "12/1" -> "12/01/"). Se usa tras una breve pausa de escritura.
const autoCompleteDate = (value: string) => {
  const [d, m, y] = value.split('/');
  const dd = padSegment(d) || '';
  const mm = padSegment(m) || '';
  const yy = y || '';
  let out = dd;
  if (mm) out += '/' + mm;
  if (yy) out += '/' + yy;
  if (dd.length === 2 && !mm) out += '/';
  if (mm.length === 2 && !yy) out += '/';
  return out;
};

const PanelCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white rounded-2xl border border-slate-200/80 shadow-premium', className)}>
    {children}
  </div>
);

const PanelCardHead = ({
  icon: Icon, title, children,
}: {
  icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  title: string; children?: React.ReactNode;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-[#0F4C81]/8 border border-[#0F4C81]/15">
        <Icon size={16} className="text-[#0F4C81]" strokeWidth={2} />
      </div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
    </div>
    {children}
  </div>
);

// Input compacto para las celdas de las tablas de síntomas/exámenes.
const Cell = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      'h-7 w-full rounded-md border border-slate-200 bg-slate-50/50 px-1.5 text-[11px]',
      'focus:outline-none focus:ring-1 focus:ring-[#0F4C81]/40 focus:bg-white focus:border-[#0F4C81]/50',
      props.className
    )}
  />
);

const pad = (n: number) => String(n).padStart(2, '0');
const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

const fieldCls = 'h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50';

export const NewFormulaLeite: React.FC = () => {
  const { t } = useTranslation();
  const {
    patients, addPatient,
    setCurrentView, activeFormulaLeiteForEdit, setActiveFormulaLeiteForEdit,
    triggerDirectPrintFormulaLeite, addFormulaLeite, updateFormulaLeite,
    lastClinicName, setLastClinicName,
    getLastKnownPatientPhone,
  } = useApp();

  const isEdit = !!activeFormulaLeiteForEdit;

  const [patientId,   setPatientId]   = useState('');
  const [patQuery,    setPatQuery]    = useState('');
  const [showPatDrop, setShowPatDrop] = useState(false);

  const [firstConsultDate, setFirstConsultDate] = useState('');
  const [patientBirthDate, setPatientBirthDate] = useState('');
  const [motherName, setMotherName] = useState('');
  const [patientCns, setPatientCns] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [professionalName, setProfessionalName] = useState(DOCTOR_NAME);
  const [institutionName, setInstitutionName] = useState('');
  const [cnes, setCnes] = useState('');
  const [solicitation, setSolicitation] = useState('');
  const [quantityMonth, setQuantityMonth] = useState('');
  const [cid, setCid] = useState('');
  const [diagnostico, setDiagnostico] = useState('');

  const [symptomsNotes, setSymptomsNotes] = useState('');
  const [symptoms, setSymptoms] = useState<SymptomEntry[]>(buildDefaultSymptoms());

  const [exams, setExams] = useState<ExamEntry[]>(buildDefaultExams());

  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [percentileBelow10, setPercentileBelow10] = useState<'sim' | 'nao' | ''>('');
  const [weightDeceleration, setWeightDeceleration] = useState<'sim' | 'nao' | ''>('');
  const [weightDecelerationTime, setWeightDecelerationTime] = useState('');
  const [nutritionHistory, setNutritionHistory] = useState<NutritionHistoryEntry[]>(buildDefaultNutritionHistory());

  const [footerDate, setFooterDate] = useState('');
  const [doctorCns, setDoctorCns] = useState(DOCTOR_CNS);
  const [doctorCpf, setDoctorCpf] = useState(DOCTOR_CPF);

  const [condutaOption, setCondutaOption] = useState<'nao_preenche' | 'liberado' | ''>('');
  const [formulaLatas, setFormulaLatas] = useState('');
  const [formulaMeses, setFormulaMeses] = useState('');
  const [formulaTypes, setFormulaTypes] = useState<string[]>([]);
  const [dataRetorno, setDataRetorno] = useState('');
  const [previsaoProvocacao, setPrevisaoProvocacao] = useState('');
  const [avaliador, setAvaliador] = useState('');

  const filteredPatients = useMemo(() => {
    if (!patQuery.trim()) return [];
    const q = patQuery.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || (p.identityCard || '').includes(q));
  }, [patients, patQuery]);

  // ── Máscara de fechas (dd/mm/aaaa) compartida entre todos los campos de fecha ──
  const dateClk = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDateClk = () => {
    if (dateClk.current) { clearTimeout(dateClk.current); dateClk.current = null; }
  };

  const handleDateMasked = (raw: string, current: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    clearDateClk();
    const deleting = raw.length < current.length;
    setter(maskBirthDate(raw, !deleting));
    if (deleting || !raw.trim()) return;
    dateClk.current = setTimeout(() => {
      setter(v => (v ? autoCompleteDate(v) : v));
      dateClk.current = null;
    }, 700);
  };

  // ── CID-10 autocomplete (compartido con Atestados/Pedidos) ─────────────────
  const [cidList, setCidList] = useState<CidEntry[]>([]);
  const [cidQuery, setCidQuery] = useState('');
  const [showCidDrop, setShowCidDrop] = useState(false);
  const cidRef = useRef<HTMLDivElement>(null);
  const cidLoaded = useRef(false);

  const loadCid = () => {
    if (cidLoaded.current) return;
    cidLoaded.current = true;
    fetch('/cid10.json').then(r => r.json()).then(d => setCidList(d)).catch(() => {});
  };

  useEffect(() => {
    loadCid();
    const timer = setTimeout(() => {
      setCidQuery(cid);
      setShowCidDrop(cid.trim().length >= 2);
    }, 300);
    return () => clearTimeout(timer);
  }, [cid]);

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

  const resetForm = useCallback(() => {
    setPatientId(''); setPatQuery('');
    setFirstConsultDate(formatDate(new Date()));
    setPatientBirthDate(''); setMotherName(''); setPatientCns(''); setPatientPhone('');
    setProfessionalName(DOCTOR_NAME);
    setInstitutionName(lastClinicName || ''); setCnes('');
    setSolicitation(''); setQuantityMonth('');
    setCid(''); setDiagnostico('');
    setSymptomsNotes(''); setSymptoms(buildDefaultSymptoms());
    setExams(buildDefaultExams());
    setWeightKg(''); setHeightCm('');
    setPercentileBelow10(''); setWeightDeceleration(''); setWeightDecelerationTime('');
    setNutritionHistory(buildDefaultNutritionHistory());
    setFooterDate(formatDate(new Date())); setDoctorCns(DOCTOR_CNS); setDoctorCpf(DOCTOR_CPF);
    setCondutaOption(''); setFormulaLatas(''); setFormulaMeses(''); setFormulaTypes([]);
    setDataRetorno(''); setPrevisaoProvocacao(''); setAvaliador('');
  }, [lastClinicName]);

  useEffect(() => {
    if (activeFormulaLeiteForEdit) {
      const d = activeFormulaLeiteForEdit;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the whole form from the edit target; too many fields to move to render phase
      setPatientId(d.patientId);
      setPatQuery(d.patientName);
      setFirstConsultDate(isoToBRDate(d.firstConsultDate));
      setPatientBirthDate(isoToBRDate(d.patientBirthDate));
      setMotherName(d.motherName || '');
      setPatientCns(d.patientCns || '');
      setPatientPhone(d.patientPhone || getLastKnownPatientPhone(d.patientId));
      setProfessionalName(d.professionalName || DOCTOR_NAME);
      setInstitutionName(d.institutionName || '');
      setCnes(d.cnes || '');
      setSolicitation(d.solicitation || '');
      setQuantityMonth(d.quantityMonth || '');
      setCid(d.cid || '');
      setDiagnostico(d.diagnostico || '');
      setSymptomsNotes(d.symptomsNotes || '');
      setSymptoms(d.symptoms?.length ? d.symptoms : buildDefaultSymptoms());
      setExams(d.exams?.length ? d.exams : buildDefaultExams());
      setWeightKg(d.weightKg || '');
      setHeightCm(d.heightCm || '');
      setPercentileBelow10(d.percentileBelow10 || '');
      setWeightDeceleration(d.weightDeceleration || '');
      setWeightDecelerationTime(d.weightDecelerationTime || '');
      setNutritionHistory(d.nutritionHistory?.length ? d.nutritionHistory : buildDefaultNutritionHistory());
      setFooterDate(isoToBRDate(d.footerDate));
      setDoctorCns(d.doctorCns || DOCTOR_CNS);
      setDoctorCpf(d.doctorCpf || DOCTOR_CPF);
      setCondutaOption(d.condutaOption || '');
      setFormulaLatas(d.formulaLatas || '');
      setFormulaMeses(d.formulaMeses || '');
      setFormulaTypes(d.formulaTypes || []);
      setDataRetorno(isoToBRDate(d.dataRetorno));
      setPrevisaoProvocacao(isoToBRDate(d.previsaoProvocacao));
      setAvaliador(d.avaliador || '');
    } else {
      resetForm();
    }
    // resetForm NO va en las deps: depende de lastClinicName (para precargar
    // institutionName), y ClinicField dispara setLastClinicName en cada
    // tecla — si resetForm estuviera acá, cada letra escrita en "Instituição"
    // volvía a disparar este efecto y en modo creación borraba todo el
    // formulario ya cargado (paciente, CID, síntomas, exames, peso...).
    // Mismo bug class ya corregido en NewEncaminhamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFormulaLeiteForEdit, getLastKnownPatientPhone]);

  const selectedPatient = patients.find(p => p.id === patientId);

  const handleSelectPatient = (id: string, name: string) => {
    setPatientId(id); setPatQuery(name); setShowPatDrop(false);
    setPatientPhone(prev => prev.trim() ? prev : getLastKnownPatientPhone(id));
  };

  // ── Síntomas (B) ────────────────────────────────────────────────────────
  const updateSymptom = (id: string, patch: Partial<SymptomEntry>) => {
    setSymptoms(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const symptomsByCategory = useMemo(() => {
    const order: SymptomEntry['category'][] = ['cutaneos', 'gastrintestinais', 'respiratorios', 'outros'];
    return order.map(cat => ({ cat, items: symptoms.filter(s => s.category === cat) }));
  }, [symptoms]);

  // ── Exames (C) ──────────────────────────────────────────────────────────
  const updateExam = (id: string, patch: Partial<ExamEntry>) => {
    setExams(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
  };

  const examsByCategory = useMemo(() => {
    const order: ExamEntry['category'][] = ['hipersensibilidade', 'gastrointestinal', 'anatomopatologico', 'outros'];
    return order.map(cat => ({ cat, items: exams.filter(e => e.category === cat) }));
  }, [exams]);

  // ── Historial nutricional (D) ──────────────────────────────────────────
  const updateNutritionRow = (index: number, patch: Partial<NutritionHistoryEntry>) => {
    setNutritionHistory(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const toggleFormulaType = (type: string) => {
    setFormulaTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));
  };

  const checkedSymptomCount = symptoms.filter(s => s.checked).length;
  const markedExamCount = exams.filter(e => e.sim !== null && e.sim !== undefined).length;

  const handleSave = async (action: 'save' | 'print') => {
    if (!patQuery.trim()) { alert(t('new_order_validation_pat')); return; }

    let fPid = patientId;
    if (!fPid) {
      const matches = findPatientsByExactName(patients, patQuery);
      if (matches.length > 1) { alert(t('patient_ambiguous_match')); return; }
      if (matches.length === 1) fPid = matches[0].id;
      else {
        try {
          const created = await addPatient({ name: patQuery.trim() });
          fPid = created.id;
        } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); return; }
      }
    }

    const payload: Omit<FormulaLeite, 'id' | 'createdBy'> = {
      patientId: fPid,
      patientName: patQuery.trim(),
      firstConsultDate: toISOSafe(firstConsultDate),
      patientBirthDate: toISOSafe(patientBirthDate),
      motherName: motherName.trim() || undefined,
      patientCns: patientCns.trim() || undefined,
      patientPhone: patientPhone.trim() || undefined,
      professionalName: professionalName.trim() || undefined,
      institutionName: institutionName.trim() || undefined,
      cnes: cnes.trim() || undefined,
      solicitation: solicitation.trim() || undefined,
      quantityMonth: quantityMonth.trim() || undefined,
      cid: cid.trim() || undefined,
      diagnostico: diagnostico.trim() || undefined,
      symptomsNotes: isRichTextEmpty(symptomsNotes) ? undefined : symptomsNotes,
      symptoms,
      exams,
      weightKg: weightKg.trim() || undefined,
      heightCm: heightCm.trim() || undefined,
      percentileBelow10: percentileBelow10 || undefined,
      weightDeceleration: weightDeceleration || undefined,
      weightDecelerationTime: weightDecelerationTime.trim() || undefined,
      nutritionHistory,
      footerDate: toISOSafe(footerDate),
      doctorCns: doctorCns.trim() || undefined,
      doctorCpf: doctorCpf.trim() || undefined,
      condutaOption: condutaOption || undefined,
      formulaLatas: formulaLatas.trim() || undefined,
      formulaMeses: formulaMeses.trim() || undefined,
      formulaTypes,
      dataRetorno: toISOSafe(dataRetorno),
      previsaoProvocacao: toISOSafe(previsaoProvocacao),
      avaliador: avaliador.trim() || undefined,
    };

    try {
      let saved: FormulaLeite;
      if (isEdit && activeFormulaLeiteForEdit) {
        const upd: FormulaLeite = { ...activeFormulaLeiteForEdit, ...payload, createdBy: activeFormulaLeiteForEdit.createdBy };
        await updateFormulaLeite(upd); saved = upd; setActiveFormulaLeiteForEdit(null);
      } else {
        saved = await addFormulaLeite(payload);
      }
      if (action === 'print') {
        triggerDirectPrintFormulaLeite(saved);
      } else {
        alert(isEdit ? t('formula_leite_success_edit') : t('formula_leite_success'));
      }
      setCurrentView('formula-leite');
    } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); }
  };

  const handleCancel = () => { if (isEdit) setActiveFormulaLeiteForEdit(null); setCurrentView('formula-leite'); };
  const handleClear = () => resetForm();

  return (
    <div className="space-y-4 animate-fade-in">

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
            {isEdit ? t('new_formula_leite_edit_title') : t('new_formula_leite_title')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('new_formula_leite_desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Paciente + Identificação (A) ────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={User} title={t('formula_leite_sec_identification')} />
            <div className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-2">{t('pat_col_name')} *</label>
                <div className="relative">
                  <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    className={`pl-10 pr-8 ${fieldCls} ${isEdit ? 'cursor-not-allowed text-slate-500' : ''}`}
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
                        onMouseDown={e => { e.preventDefault(); handleSelectPatient(p.id, p.name); }}
                        className="flex items-center gap-3 text-left w-full px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-xs font-bold shrink-0">
                          {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-400">{hasIdentity(p.identityCard) ? `CPF: ${p.identityCard}` : ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {patientId && selectedPatient && (
                  <>
                    <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      {selectedPatient.name}
                    </div>
                    <EditPatientNameButton patientId={patientId} onRenamed={setPatQuery} />
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Data de nascimento</label>
                  <Input
                    className={fieldCls}
                    placeholder="08/05/1997"
                    value={patientBirthDate}
                    onChange={e => handleDateMasked(e.target.value, patientBirthDate, setPatientBirthDate)}
                    onBlur={() => { clearDateClk(); setPatientBirthDate(v => (v ? autoCompleteDate(v) : v)); }}
                  />
                  {patientBirthDate && (
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); setPatientBirthDate(''); }}
                      className="absolute right-3 top-1/2 translate-y-[5px] text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Nome da mãe</label>
                  <Input className={fieldCls} value={motherName} onChange={e => setMotherName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">CNS do paciente</label>
                  <Input className={fieldCls} value={patientCns} onChange={e => setPatientCns(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  {t('patient_phone_label')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <Input type="tel" className={fieldCls} placeholder={t('patient_phone_placeholder')}
                  value={patientPhone} onChange={e => setPatientPhone(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Data da primeira consulta</label>
                  <Input
                    className={fieldCls}
                    placeholder="23/07/2026"
                    value={firstConsultDate}
                    onChange={e => handleDateMasked(e.target.value, firstConsultDate, setFirstConsultDate)}
                    onBlur={() => { clearDateClk(); setFirstConsultDate(v => (v ? autoCompleteDate(v) : v)); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Nome do profissional</label>
                  <Input className={fieldCls} value={professionalName} onChange={e => setProfessionalName(e.target.value)} />
                </div>
              </div>
            </div>
          </PanelCard>

          {/* ── Instituição / CNES / Solicitação ───────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Building2} title="Instituição e solicitação" />
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Nome da instituição</label>
                <ClinicField value={institutionName} onValueChange={v => { setInstitutionName(v); setLastClinicName(v); }} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">CNES</label>
                  <Input className={fieldCls} value={cnes} onChange={e => setCnes(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Quantidade/mês</label>
                  <Input className={fieldCls} value={quantityMonth} onChange={e => setQuantityMonth(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Solicitação</label>
                <Input className={fieldCls} value={solicitation} onChange={e => setSolicitation(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative" ref={cidRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('print_cid')}</label>
                  <Input
                    className={fieldCls}
                    placeholder="K52.2"
                    value={cid}
                    onChange={e => { setCid(e.target.value.toUpperCase()); setCidQuery(e.target.value); }}
                    onFocus={() => { if (cid.trim().length >= 2) setShowCidDrop(true); }}
                    onBlur={() => setTimeout(() => setShowCidDrop(false), 150)}
                    autoComplete="off"
                  />
                  {showCidDrop && cidSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-premium-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                      {cidSuggestions.map(entry => (
                        <button key={entry.codigo} type="button"
                          onMouseDown={e => { e.preventDefault(); setCid(entry.codigo); setCidQuery(entry.codigo); setShowCidDrop(false); }}
                          className="flex items-center gap-3 text-left w-full px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                          <span className="font-mono text-sm font-semibold text-slate-900 shrink-0">{entry.codigo}</span>
                          <span className="text-sm text-slate-600 truncate">{entry.descripcion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Diagnóstico</label>
                  <Input className={fieldCls} value={diagnostico} onChange={e => setDiagnostico(e.target.value)} />
                </div>
              </div>
            </div>
          </PanelCard>

          {/* ── B) Sinais e sintomas clínicos ──────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Stethoscope} title={t('formula_leite_sec_symptoms')} />
            <div className="p-6 space-y-5">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wide">
                      <th className="text-left py-1 pr-2 font-semibold">Sintoma</th>
                      <th className="text-left py-1 px-1 font-semibold w-20">Idade inicial</th>
                      <th className="text-left py-1 px-1 font-semibold w-20">Tempo latência</th>
                      <th className="text-left py-1 px-1 font-semibold w-20">Duração</th>
                      <th className="text-left py-1 px-1 font-semibold w-20">Freqüência</th>
                      <th className="text-left py-1 px-1 font-semibold w-24">Ultimo episódio</th>
                      <th className="text-left py-1 pl-1 font-semibold w-28">Tratamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symptomsByCategory.map(group => (
                      <React.Fragment key={group.cat}>
                        <tr>
                          <td colSpan={7} className="pt-3 pb-1 text-[11px] font-bold text-slate-600">
                            {SYMPTOM_CATEGORY_LABELS[group.cat]}
                          </td>
                        </tr>
                        {group.items.map(s => (
                          <tr key={s.id} className="border-b border-slate-50">
                            <td className="py-1 pr-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={s.checked}
                                  onChange={e => updateSymptom(s.id, { checked: e.target.checked })}
                                  className="accent-[#0F4C81] w-3.5 h-3.5"
                                />
                                <span className="text-[12px] text-slate-700">{s.label}</span>
                              </label>
                            </td>
                            <td className="px-1 py-1"><Cell value={s.idadeInicial || ''} onChange={e => updateSymptom(s.id, { idadeInicial: e.target.value })} /></td>
                            <td className="px-1 py-1"><Cell value={s.tempoLatencia || ''} onChange={e => updateSymptom(s.id, { tempoLatencia: e.target.value })} /></td>
                            <td className="px-1 py-1"><Cell value={s.duracao || ''} onChange={e => updateSymptom(s.id, { duracao: e.target.value })} /></td>
                            <td className="px-1 py-1"><Cell value={s.frequencia || ''} onChange={e => updateSymptom(s.id, { frequencia: e.target.value })} /></td>
                            <td className="px-1 py-1"><Cell value={s.ultimoEpisodio || ''} onChange={e => updateSymptom(s.id, { ultimoEpisodio: e.target.value })} /></td>
                            <td className="pl-1 py-1"><Cell value={s.tratamento || ''} onChange={e => updateSymptom(s.id, { tratamento: e.target.value })} /></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400">
                * Tempo necessário entre a ingestão do alimento e o aparecimento dos sintomas
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Especifique os sintomas mais exacerbados</label>
                <RichTextField
                  value={symptomsNotes}
                  onChange={setSymptomsNotes}
                  className="border border-slate-200 rounded-xl bg-white focus-within:border-[#0F4C81]/50 transition-colors overflow-hidden"
                  style={{ minHeight: '72px' }}
                />
              </div>
            </div>
          </PanelCard>

          {/* ── C) Exames subsidiários ──────────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={FlaskConical} title={t('formula_leite_sec_exams')} />
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wide">
                      <th className="text-left py-1 pr-2 font-semibold">Tipo</th>
                      <th className="text-left py-1 px-1 font-semibold w-24">Sim / Não</th>
                      <th className="text-left py-1 px-1 font-semibold w-24">Data</th>
                      <th className="text-left py-1 pl-1 font-semibold w-32">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examsByCategory.map(group => (
                      <React.Fragment key={group.cat}>
                        <tr>
                          <td colSpan={4} className="pt-3 pb-1 text-[11px] font-bold text-slate-600">
                            {group.cat === 'outros' ? `${EXAM_CATEGORY_LABELS.outros} / Provocação` : EXAM_CATEGORY_LABELS[group.cat]}
                          </td>
                        </tr>
                        {group.items.map(e => (
                          <tr key={e.id} className="border-b border-slate-50">
                            <td className="py-1 pr-2">
                              {group.cat === 'outros' ? (
                                <Cell placeholder="Especificar..." value={e.label} onChange={ev => updateExam(e.id, { label: ev.target.value })} />
                              ) : (
                                <span className="text-[12px] text-slate-700">{e.label}</span>
                              )}
                            </td>
                            <td className="px-1 py-1">
                              {group.cat !== 'outros' && (
                                <div className="flex gap-2 text-[11px]">
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name={`sim-${e.id}`} checked={e.sim === true} onChange={() => updateExam(e.id, { sim: true })} className="accent-[#0F4C81]" />
                                    Sim
                                  </label>
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name={`sim-${e.id}`} checked={e.sim === false} onChange={() => updateExam(e.id, { sim: false })} className="accent-[#0F4C81]" />
                                    Não
                                  </label>
                                </div>
                              )}
                            </td>
                            <td className="px-1 py-1"><Cell value={e.data || ''} onChange={ev => updateExam(e.id, { data: ev.target.value })} /></td>
                            <td className="pl-1 py-1"><Cell value={e.resultado || ''} onChange={ev => updateExam(e.id, { resultado: ev.target.value })} /></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </PanelCard>

          {/* ── D) Avaliação nutricional ────────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Scale} title={t('formula_leite_sec_nutrition')} />
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Peso (kg)</label>
                  <Input className={fieldCls} value={weightKg} onChange={e => setWeightKg(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Estatura (cm)</label>
                  <Input className={fieldCls} value={heightCm} onChange={e => setHeightCm(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Criança no percentil de peso inferior a 10</label>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="percentile" checked={percentileBelow10 === 'nao'} onChange={() => setPercentileBelow10('nao')} className="accent-[#0F4C81]" /> Não
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="percentile" checked={percentileBelow10 === 'sim'} onChange={() => setPercentileBelow10('sim')} className="accent-[#0F4C81]" /> Sim
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Desaceleração da curva de peso</label>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="deceleration" checked={weightDeceleration === 'nao'} onChange={() => setWeightDeceleration('nao')} className="accent-[#0F4C81]" /> Não
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="deceleration" checked={weightDeceleration === 'sim'} onChange={() => setWeightDeceleration('sim')} className="accent-[#0F4C81]" /> Sim
                  </label>
                  <Input className={cn(fieldCls, 'max-w-[200px]')} placeholder="Há quanto tempo?" value={weightDecelerationTime} onChange={e => setWeightDecelerationTime(e.target.value)} />
                </div>
              </div>

              {weightDeceleration === 'sim' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Últimos pesos e datas</label>
                  <div className="space-y-2">
                    {nutritionHistory.map((row, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-4">{i + 1}.</span>
                        <Input className={fieldCls} placeholder="Data" value={row.data || ''} onChange={e => updateNutritionRow(i, { data: e.target.value })} />
                        <Input className={fieldCls} placeholder="Peso (kg)" value={row.peso || ''} onChange={e => updateNutritionRow(i, { peso: e.target.value })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Data (rodapé)</label>
                  <Input
                    className={fieldCls}
                    placeholder="23/07/2026"
                    value={footerDate}
                    onChange={e => handleDateMasked(e.target.value, footerDate, setFooterDate)}
                    onBlur={() => { clearDateClk(); setFooterDate(v => (v ? autoCompleteDate(v) : v)); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">CNS do médico</label>
                  <Input className={fieldCls} value={doctorCns} onChange={e => setDoctorCns(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">CPF do médico</label>
                  <Input className={fieldCls} value={doctorCpf} onChange={e => setDoctorCpf(e.target.value)} />
                </div>
              </div>
            </div>
          </PanelCard>

          {/* ── F) Conduta (uso restrito a SES-SP) ─────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={ClipboardCheck} title={t('formula_leite_sec_conduta')} />
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio" name="conduta" checked={condutaOption === 'nao_preenche'}
                    onClick={() => setCondutaOption(prev => (prev === 'nao_preenche' ? '' : 'nao_preenche'))}
                    onChange={() => {}}
                    className="accent-[#0F4C81]"
                  />
                  No momento, não preenche os critérios
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio" name="conduta" checked={condutaOption === 'liberado'}
                    onClick={() => setCondutaOption(prev => (prev === 'liberado' ? '' : 'liberado'))}
                    onChange={() => {}}
                    className="accent-[#0F4C81]"
                  />
                  Liberado o fornecimento de fórmula especial
                </label>
                {condutaOption && (
                  <button
                    type="button"
                    onClick={() => setCondutaOption('')}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600 underline underline-offset-2"
                  >
                    Destildar / dejar sin marcar
                  </button>
                )}
              </div>

              {condutaOption === 'liberado' && (
                <div className="pl-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Quantidade (latas)</label>
                      <Input className={fieldCls} value={formulaLatas} onChange={e => setFormulaLatas(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2">Por (meses)</label>
                      <Input className={fieldCls} value={formulaMeses} onChange={e => setFormulaMeses(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {FORMULA_TYPES.map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={formulaTypes.includes(opt)} onChange={() => toggleFormulaType(opt)} className="accent-[#0F4C81]" />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Data do retorno</label>
                  <Input
                    className={fieldCls}
                    placeholder="23/07/2026"
                    value={dataRetorno}
                    onChange={e => handleDateMasked(e.target.value, dataRetorno, setDataRetorno)}
                    onBlur={() => { clearDateClk(); setDataRetorno(v => (v ? autoCompleteDate(v) : v)); }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Previsão do teste de provocação</label>
                  <Input
                    className={fieldCls}
                    placeholder="23/07/2026"
                    value={previsaoProvocacao}
                    onChange={e => handleDateMasked(e.target.value, previsaoProvocacao, setPrevisaoProvocacao)}
                    onBlur={() => { clearDateClk(); setPrevisaoProvocacao(v => (v ? autoCompleteDate(v) : v)); }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Avaliador</label>
                <Input className={fieldCls} value={avaliador} onChange={e => setAvaliador(e.target.value)} />
              </div>
            </div>
          </PanelCard>

        </div>

        {/* ── Columna derecha — Resumen sticky ─────────────────────────── */}
        <div className="lg:col-span-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-4">
          <PanelCard>
            <PanelCardHead icon={ClipboardList} title={t('receta_sec_summary')} />
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('pat_col_name')}</p>
                {patQuery.trim() ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-xs font-bold shrink-0">
                      {patQuery.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight">{patQuery}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">{t('receta_no_patient')}</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('print_cid')}</p>
                <p className="text-sm font-semibold text-slate-900">{cid || '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sintomas</p>
                  <p className="text-xs font-semibold text-slate-900">{checkedSymptomCount} marcados</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Exames</p>
                  <p className="text-xs font-semibold text-slate-900">{markedExamCount} marcados</p>
                </div>
              </div>
            </div>
          </PanelCard>

          <div className="space-y-2">
            <button type="button" onClick={() => handleSave('save')}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all">
              <Check size={17} strokeWidth={2.5} />
              {t('save')}
            </button>
            <button type="button" onClick={() => handleSave('print')}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all">
              <Save size={16} />
              {t('save_and_print')}
            </button>
            <button type="button" onClick={handleClear}
              className="flex items-center justify-center w-full h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
              {t('formula_leite_clear_btn')}
            </button>
            <button type="button" onClick={handleCancel}
              className="flex items-center justify-center w-full h-10 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

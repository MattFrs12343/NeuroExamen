import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Atestado } from '../types';
import {
  User, Search, Calendar, Check, ArrowLeft, X,
  ClipboardList, CheckCircle2,
  FileCheck, Clock, Save, Building2,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { cn, getErrorMessage, hasIdentity } from '../lib/utils';
import { DOCTOR_NAME, DOCTOR_CRM, DOCTOR_ADDRESS } from '../lib/doctor';
import { findClinicProfile } from '../lib/clinic';

interface CidEntry { codigo: string; descripcion: string; }

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

const pad = (n: number) => String(n).padStart(2, '0');
const formatDateTime = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

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

export const NewAtestado: React.FC = () => {
  const { t } = useTranslation();
  const {
    patients, addPatient,
    setCurrentView, activeAtestadoForEdit, setActiveAtestadoForEdit,
    triggerDirectPrintAtestado, addAtestado, updateAtestado,
    clinicProfiles, lastClinicName, setLastClinicName,
  } = useApp();

  const isEdit = !!activeAtestadoForEdit;

  // ── Dados do Emitente ───────────────────────────────────────────────
  const [clinicName, setClinicName] = useState(lastClinicName); // Prefeitura

  const [patientId,   setPatientId]   = useState('');
  const [patQuery,    setPatQuery]    = useState('');
  const [showPatDrop, setShowPatDrop] = useState(false);
  const [patCpf,      setPatCpf]      = useState('');
  const [patBirth,    setPatBirth]    = useState('');
  const [patAddress,  setPatAddress]  = useState('');
  const [issuedAt,    setIssuedAt]    = useState('');
  const [cid,         setCid]         = useState('');
  const [careStart,   setCareStart]   = useState('');
  const [careEnd,     setCareEnd]     = useState('');
  const [careDate,    setCareDate]    = useState('');
  const [restDays,    setRestDays]    = useState('');
  const [observation, setObservation] = useState('');

  const dateClk = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDateClk = () => {
    if (dateClk.current) { clearTimeout(dateClk.current); dateClk.current = null; }
  };

  // Manejador compartido para campos de fecha (nacimiento / atención):
  // aplica la máscara al escribir y, si el usuario hace una pausa breve con un
  // segmento de 1 dígito, lo completa con su cero (701997 -> "07/01/997").
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

  const filteredPatients = useMemo(() => {
    if (!patQuery.trim()) return [];
    const q = patQuery.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || (p.identityCard || '').includes(q));
  }, [patients, patQuery]);

  // Solo las clínicas con perfil cargado son seleccionables (igual que en Recetas).
  const clinicOptions = useMemo(
    () => clinicProfiles.filter(c => c.secretaria || c.sistema || c.address || c.phone || c.cnpj),
    [clinicProfiles]
  );

  // Derivados en vivo del perfil de la clínica seleccionada — nunca quedan
  // desincronizados de `clinicName`. El match usa una clave normalizada (sin
  // acentos/espacios/símbolos) para que el bloque "Dados que serão impressos"
  // y la impresión no queden vacíos.
  const selectedClinicProfile = useMemo(
    () => findClinicProfile(clinicProfiles, clinicName),
    [clinicName, clinicProfiles]
  );
  const clinicSecretaria = selectedClinicProfile?.secretaria || '';
  const clinicSistema    = selectedClinicProfile?.sistema    || '';
  const clinicAddress    = selectedClinicProfile?.address    || '';
  const clinicPhone      = selectedClinicProfile?.phone      || '';
  const clinicCnpj       = selectedClinicProfile?.cnpj       || '';

  // `lastClinicName` es compartido con Pedidos/Encaminhamentos/Recetas (texto
  // libre), así que puede traer un nombre que no existe en `receta_clinics`.
  // Para un atestado NUEVO, si no hay perfil que respalde ese nombre, lo
  // descartamos para no guardar una clínica sin datos ni mostrar preview vacío.
  // Ajuste hecho durante el render (no en un efecto): clinicName solo cambia
  // por acciones puntuales, nunca tecla a tecla, así que no hay riesgo de loop.
  if (!isEdit && clinicProfiles.length && clinicName && !selectedClinicProfile) {
    setClinicName('');
  }

  const handleSelectClinic = (name: string) => {
    setClinicName(name); setLastClinicName(name);
  };

  // CID-10 autocomplete (shared with Pedidos)
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

  // Generación de valores por defecto para un documento nuevo.
  const generateDefaults = () => {
    const now = new Date();
    return {
      issuedAt: formatDateTime(now),
      careDate: formatDate(now),
    };
  };

  useEffect(() => {
    if (activeAtestadoForEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the whole form from the edit target; too many fields to move to render phase
      setPatientId(activeAtestadoForEdit.patientId);
      const p = patients.find(p => p.id === activeAtestadoForEdit.patientId);
      if (p) setPatQuery(p.name);
      setPatCpf(activeAtestadoForEdit.patientIdentityCard || '');
      setPatBirth(activeAtestadoForEdit.patientBirthDate || '');
      setPatAddress(activeAtestadoForEdit.patientAddress || '');
      setClinicName(activeAtestadoForEdit.clinicName || '');
      setIssuedAt(activeAtestadoForEdit.issuedAt || '');
      setCid(activeAtestadoForEdit.cid || '');
      setCareStart(activeAtestadoForEdit.careStartTime || '');
      setCareEnd(activeAtestadoForEdit.careEndTime || '');
      setCareDate(activeAtestadoForEdit.careDate || '');
      setRestDays(activeAtestadoForEdit.restDays || '');
      setObservation(activeAtestadoForEdit.observation || '');
    } else {
      const d = generateDefaults();
      setPatientId(''); setPatQuery(''); setPatCpf(''); setPatBirth(''); setPatAddress('');
      setIssuedAt(d.issuedAt); setCid(''); setCareStart(''); setCareEnd('');
      setCareDate(d.careDate); setRestDays(''); setObservation('');
    }
  }, [activeAtestadoForEdit, patients]);

  const selectedPatient = patients.find(p => p.id === patientId);

  const handleSelectPatient = (id: string, name: string) => {
    setPatientId(id); setPatQuery(name); setShowPatDrop(false);
  };

  const handleSave = async (print: boolean) => {
    if (!patQuery.trim()) { alert(t('new_order_validation_pat')); return; }

    let fPid = patientId;
    if (!fPid) {
      const exact = patients.find(p => p.name.toLowerCase() === patQuery.trim().toLowerCase());
      if (exact) fPid = exact.id;
      else {
        try {
          const created = await addPatient({
            name: patQuery.trim(),
            identityCard: patCpf.trim() || undefined,
          });
          fPid = created.id;
        } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); return; }
      }
    }

    const payload: Omit<Atestado, 'id' | 'createdBy'> = {
      patientId: fPid,
      patientName: patQuery.trim(),
      patientIdentityCard: patCpf.trim(),
      patientBirthDate: patBirth.trim() || undefined,
      patientAddress: patAddress.trim() || undefined,
      clinicName: clinicName.trim() || undefined,
      clinicSecretaria: clinicSecretaria.trim() || undefined,
      clinicSistema: clinicSistema.trim() || undefined,
      clinicAddress: clinicAddress.trim() || undefined,
      clinicPhone: clinicPhone.trim() || undefined,
      clinicCnpj: clinicCnpj.trim() || undefined,
      issuedAt: issuedAt.trim() || undefined,
      cid: cid.trim() || undefined,
      careStartTime: careStart.trim() || undefined,
      careEndTime: careEnd.trim() || undefined,
      careDate: careDate.trim() || undefined,
      restDays: restDays.trim() || undefined,
      observation: observation.trim() || undefined,
      doctorName: DOCTOR_NAME,
      doctorCrm: DOCTOR_CRM,
      doctorAddress: DOCTOR_ADDRESS,
      signedAt: issuedAt.trim() || undefined,
    };

    try {
      let saved: Atestado;
      if (isEdit && activeAtestadoForEdit) {
        const upd: Atestado = { ...activeAtestadoForEdit, ...payload, createdBy: activeAtestadoForEdit.createdBy };
        await updateAtestado(upd); saved = upd; setActiveAtestadoForEdit(null);
      } else {
        saved = await addAtestado(payload);
      }
      if (print) triggerDirectPrintAtestado(saved);
      else alert(isEdit ? t('atestado_success_edit') : t('atestado_success'));
      setCurrentView('atestados');
    } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); }
  };

  const handleCancel = () => { if (isEdit) setActiveAtestadoForEdit(null); setCurrentView('atestados'); };

  const handleClear = () => {
    setPatientId(''); setPatQuery(''); setPatCpf(''); setPatBirth(''); setPatAddress('');
    setClinicName('');
    setCid(''); setCareStart(''); setCareEnd(''); setRestDays(''); setObservation('');
  };

  const fieldCls = 'h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50';

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
            {isEdit ? t('new_atestado_edit_title') : t('new_atestado_title')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('new_atestado_desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Bloque 1: Dados do Emitente ────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Building2} title={t('receta_sec_emitter')} />
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  {t('receta_emitter_prefeitura')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <div className="relative">
                  <Building2 size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
                  <select
                    value={clinicName}
                    onChange={e => handleSelectClinic(e.target.value)}
                    className="flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]/50 focus:bg-white cursor-pointer transition-all"
                  >
                    <option value="">{t('receta_clinic_select_placeholder')}</option>
                    {clinicOptions.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {clinicName && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-600 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('receta_clinic_preview_title')}</p>
                  {clinicSecretaria && <p>{clinicSecretaria}</p>}
                  {clinicSistema && <p>{clinicSistema}</p>}
                  {clinicAddress && <p className="whitespace-pre-line">{clinicAddress}</p>}
                  {clinicPhone && <p className="whitespace-pre-line"><strong className="font-semibold text-slate-700">Tel:</strong> {clinicPhone}</p>}
                  {clinicCnpj && <p><strong className="font-semibold text-slate-700">CNPJ:</strong> {clinicCnpj}</p>}
                </div>
              )}
            </div>
          </PanelCard>

          {/* ── Bloque 2: Datos del Paciente ───────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={User} title={t('receta_sec_patient')} />
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('pat_col_name')} *</label>
                  <div className="relative">
                    <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      className={`pl-10 pr-8 ${fieldCls}`}
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
                          onMouseDown={e => { e.preventDefault(); handleSelectPatient(p.id, p.name); setPatCpf(hasIdentity(p.identityCard) ? p.identityCard! : ''); }}
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
                    <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <CheckCircle2 size={13} strokeWidth={2.5} />
                      {selectedPatient.name}{hasIdentity(selectedPatient.identityCard) ? ` — CPF: ${selectedPatient.identityCard}` : ''}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {t('atestado_cpf')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <Input className={fieldCls} placeholder="000.000.000-00" value={patCpf} onChange={e => setPatCpf(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {t('atestado_birth')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <Input
                    className={fieldCls}
                    placeholder="08/05/1997"
                    value={patBirth}
                    onChange={e => handleDateMasked(e.target.value, patBirth, setPatBirth)}
                    onBlur={() => { clearDateClk(); setPatBirth(v => (v ? autoCompleteDate(v) : v)); }}
                  />
                  {patBirth && (
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); setPatBirth(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {t('atestado_issue_date')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <Input className={fieldCls} placeholder="23/07/2026 - 10:51:28" value={issuedAt} onChange={e => setIssuedAt(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  {t('atestado_pat_address')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <Input className={fieldCls} placeholder={t('receta_pat_address_placeholder')} value={patAddress} onChange={e => setPatAddress(e.target.value)} />
              </div>
            </div>
          </PanelCard>

          {/* ── Bloque 2: Contenido Médico ──────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={FileCheck} title={t('atestado_sec_medical')} />
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative" ref={cidRef}>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('print_cid')}</label>
                  <Input
                    className={fieldCls}
                    placeholder="F41.1"
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('atestado_care_date')}</label>
                  <div className="relative">
                    <Calendar size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input className={`pl-10 ${fieldCls}`} placeholder="23/07/2026" value={careDate}
                    onChange={e => handleDateMasked(e.target.value, careDate, setCareDate)}
                    onBlur={() => { clearDateClk(); setCareDate(v => (v ? autoCompleteDate(v) : v)); }} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('atestado_start_time')}</label>
                  <div className="relative">
                    <Clock size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input className={`pl-10 ${fieldCls}`} placeholder="10h20" value={careStart} onChange={e => setCareStart(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('atestado_end_time')}</label>
                  <div className="relative">
                    <Clock size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input className={`pl-10 ${fieldCls}`} placeholder="10h45" value={careEnd} onChange={e => setCareEnd(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('atestado_rest_days')}</label>
                  <Input className={fieldCls} placeholder="10" value={restDays} onChange={e => setRestDays(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {t('atestado_observation')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <Input className={fieldCls} placeholder="F411+F3" value={observation} onChange={e => setObservation(e.target.value)} />
                </div>
              </div>
            </div>
          </PanelCard>

        </div>

        {/* ── Columna derecha — Resumen sticky ─────────────────────────── */}
        <div className="lg:col-span-1 lg:sticky lg:top-20 space-y-4">
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
                    <div>
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{patQuery}</p>
                      {patCpf && <p className="text-xs text-slate-400">{patCpf}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">{t('receta_no_patient')}</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('print_cid')}</p>
                <p className="text-sm font-semibold text-slate-900">{cid || '—'}</p>
              </div>

              {clinicName && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('print_clinic_label')}</p>
                  <p className="text-sm font-semibold text-slate-900">{clinicName}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('atestado_sec_atendimento')}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('atestado_start_time')}</p>
                    <p className="text-xs font-semibold text-slate-900">{careStart || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('atestado_end_time')}</p>
                    <p className="text-xs font-semibold text-slate-900">{careEnd || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('atestado_rest_days')}</p>
                    <p className="text-xs font-semibold text-slate-900">{restDays ? `${restDays} dia(s)` : '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </PanelCard>

          <div className="space-y-2">
            <button type="button" onClick={() => handleSave(false)}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all">
              <Check size={17} strokeWidth={2.5} />
              {t('save')}
            </button>
            <button type="button" onClick={() => handleSave(true)}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all">
              <Save size={16} />
              {t('save_and_print')}
            </button>
            <button type="button" onClick={handleClear}
              className="flex items-center justify-center w-full h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors">
              {t('receta_clear_btn')}
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

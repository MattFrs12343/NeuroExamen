import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { MedicationLine, Patient } from '../types';
import {
  User, Search, Calendar, Check, ArrowLeft, X,
  Building2, PlusCircle, ClipboardList, CheckCircle2,
  Pill, Trash2, FileSignature, Maximize2,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RichTextField } from '../components/ui/rich-text-field';
import { ExpandableRichField } from '../components/ExpandableRichField';
import { RichText } from '../components/RichText';
import { ClinicProfileField } from '../components/ClinicProfileField';
import { EditPatientNameButton } from '../components/EditPatientNameButton';
import { MedicationModal } from '../components/MedicationModal';
import { cn, findPatientsByExactName, getErrorMessage, hasIdentity } from '../lib/utils';
import { isRichTextEmpty, richTextToPlain } from '../lib/richText';
import { findClinicProfile, normalizeClinicKey } from '../lib/clinic';

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

const FieldLabel = ({
  children, optional, optionalText,
}: { children: React.ReactNode; optional?: boolean; optionalText: string }) => (
  <label className="block text-xs font-semibold text-slate-700 mb-2">
    {children} {optional && <span className="text-slate-400 font-normal">({optionalText})</span>}
  </label>
);

const emptyLine = (): MedicationLine => ({
  id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  text: '',
});

// Normaliza un nombre para compararlo tolerando suciedad heredada de datos
// viejos (dos puntos iniciales, paréntesis sobrantes, dobles espacios, falta
// de acentos, etc.). Solo se usa para MATCHEAR: los nombres se muestran y se
// guardan tal cual. Reutiliza la misma normalización que el match de clínicas.
const normName = (s?: string | null): string => normalizeClinicKey(s);

// Limpia lo esencial (trim + espacios colapsados) cuando se GUARDA un
// paciente nuevo, para no seguir generando nombres duplicados con basura.
const cleanName = (s: string): string => s.trim().replace(/\s+/g, ' ');

export const NewReceta: React.FC = () => {
  const { t } = useTranslation();
  const {
    patients, recetas, clinicProfiles, addPatient, updatePatient,
    setCurrentView, activeRecetaForEdit, setActiveRecetaForEdit,
    triggerDirectPrintReceta, triggerSignAndPrint, addReceta, updateReceta,
    setLastClinicName, lastClinicName, setRecetaPrintCopies,
    getLastKnownPatientPhone, getLastKnownPatientAddress,
  } = useApp();

  // CPF del paciente como fallback: si el paciente no tiene `identityCard`
  // cargado, se toma el de su receta más reciente que sí lo tenga — es el
  // único módulo con un campo de CPF propio, así que no hace falta buscar
  // cross-módulo (a diferencia de teléfono/dirección, que sí se comparten
  // vía getLastKnownPatientPhone/Address en AppContext).
  const lastKnownCpf = useCallback((patientId: string): string => {
    const withCpf = recetas.filter(r => r.patientId === patientId && r.patientCpf);
    if (!withCpf.length) return '';
    return withCpf
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0]
      .patientCpf || '';
  }, [recetas]);

  const isEdit = !!activeRecetaForEdit;

  // ── Dados do Emitente ──────────────────────────────────────────────────
  const [clinicName, setClinicName] = useState(lastClinicName); // global shared

  // ── Dados do Paciente ───────────────────────────────────────────────────
  const [patientId,      setPatientId]      = useState('');
  const [patQuery,       setPatQuery]       = useState('');
  const [showPatDrop,    setShowPatDrop]    = useState(false);
  const [recetaDate,     setRecetaDate]     = useState('');
  const [noDate,         setNoDate]         = useState(false);
  const [patientAddress, setPatientAddress] = useState(''); // Endereço
  const [patientCpf, setPatientCpf] = useState(''); // CPF — texto libre
  const [patientPhone, setPatientPhone] = useState(''); // Teléfono — texto libre
  const [printTwoCopies, setPrintTwoCopies] = useState(false); // Imprimir 2 vias

  // ── Prescrição ──────────────────────────────────────────────────────────
  const [observations,   setObservations]   = useState('');
  const [medications,    setMedications]    = useState<MedicationLine[]>([]);
  const [selectedMedication, setSelectedMedication] = useState<{ id: string; text: string } | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draft,          setDraft]          = useState<MedicationLine>(emptyLine());

  // Vademecum (autocompletado del campo "Medicamento") — se carga bajo
  // demanda, recién cuando el Dr. usa el campo (igual que el CID-10).
  const [vademecum,   setVademecum]   = useState<string[]>([]);
  const [showMedDrop, setShowMedDrop] = useState(false);
  const vademecumLoaded = useRef(false);

  const loadVademecum = () => {
    if (vademecumLoaded.current) return;
    vademecumLoaded.current = true;
    fetch('/vademecum.json').then(r => r.json()).then(d => setVademecum(d)).catch(() => {});
  };

  const medSuggestions = useMemo(() => {
    const q = richTextToPlain(draft.text).trim().toLowerCase();
    if (q.length < 2 || !vademecum.length) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const name of vademecum) {
      const low = name.toLowerCase();
      if (low.startsWith(q)) { if (starts.length < 30) starts.push(name); }
      else if (contains.length < 30 && low.includes(q)) { contains.push(name); }
      if (starts.length >= 30 && contains.length >= 30) break;
    }
    return [...starts, ...contains].slice(0, 30);
  }, [draft.text, vademecum]);

  const filteredPatients = useMemo(() => {
    if (!patQuery.trim()) return [];
    const q = normName(patQuery);
    return patients.filter(p => normName(p.name).includes(q) || normName(p.identityCard).includes(q));
  }, [patients, patQuery]);

  // Clínicas con perfil disponibles para el selector (Recetas + Atestados).
  const clinicOptions = useMemo(
    () => clinicProfiles,
    [clinicProfiles]
  );

  // Derivados en vivo del perfil de la clínica seleccionada — nunca quedan
  // desincronizados de `clinicName` (antes se copiaban a estado propio solo
  // al elegir del <select>, así que un clinicName precargado al montar
  // —p. ej. desde la última clínica usada— no traía sus datos).
  // El match usa una clave normalizada (sin acentos/espacios/símbolos) para
  // que nombres tipo "PRO CLINICA SUMARÉ" encuentren el perfil "PRO-CLINICA
  // SUMARE" y el bloque "Dados que serão impressos" y la impresión no queden vacíos.
  const selectedClinicProfile = useMemo(
    () => findClinicProfile(clinicProfiles, clinicName),
    [clinicName, clinicProfiles]
  );
  const clinicSecretaria = selectedClinicProfile?.secretaria || '';
  const clinicSistema    = selectedClinicProfile?.sistema    || '';
  const clinicAddress    = selectedClinicProfile?.address    || '';
  const clinicPhone      = selectedClinicProfile?.phone      || '';
  const clinicCnpj       = selectedClinicProfile?.cnpj       || '';

  // La clínica pegajosa recordada podría haber sido eliminada del catálogo
  // `receta_clinics` desde la última vez. Para una receta NUEVA, si no hay
  // perfil que respalde ese nombre, lo descartamos (y olvidamos la memoria)
  // para no guardar una clínica sin datos ni mostrar el preview vacío.
  // Ajuste hecho durante el render (no en un efecto): clinicName solo cambia
  // por acciones puntuales (seleccionar, prefill, limpiar), nunca tecla a
  // tecla, así que no hay riesgo de loop ni de pisar lo que el usuario escribe.
  if (!isEdit && clinicProfiles.length && clinicName && !selectedClinicProfile) {
    setClinicName('');
    setLastClinicName('');
  }

  const handleSelectClinic = (name: string) => {
    setClinicName(name);
    setLastClinicName(name); // global shared
  };

  // Prefill en modo edición
  useEffect(() => {
    if (activeRecetaForEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the whole form from the edit target; too many fields to safely move to render-phase
      setPatientId(activeRecetaForEdit.patientId);
      const p = patients.find(p => p.id === activeRecetaForEdit.patientId);
      if (p) setPatQuery(p.name);
      setRecetaDate(activeRecetaForEdit.date || '');
      setNoDate(!activeRecetaForEdit.date);
      setPatientAddress(activeRecetaForEdit.patientAddress || p?.address || getLastKnownPatientAddress(activeRecetaForEdit.patientId));
      setPatientCpf(activeRecetaForEdit.patientCpf || p?.identityCard || lastKnownCpf(activeRecetaForEdit.patientId));
      setPatientPhone(activeRecetaForEdit.patientPhone || getLastKnownPatientPhone(activeRecetaForEdit.patientId));

      setClinicName(activeRecetaForEdit.clinicName || '');

      setObservations(activeRecetaForEdit.observations || '');
      setMedications(activeRecetaForEdit.medications || []);
    } else {
      const now = new Date();
      setRecetaDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setNoDate(false);
      setMedications([]);
    }
  }, [activeRecetaForEdit, patients, getLastKnownPatientAddress, lastKnownCpf, getLastKnownPatientPhone]);

  const handleToggleNoDate = (checked: boolean) => {
    setNoDate(checked);
    if (checked) {
      setRecetaDate('');
    } else if (!recetaDate) {
      const now = new Date();
      setRecetaDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    }
  };

  const selectedPatient = patients.find(p => p.id === patientId);

  const handleSelectPatient = (id: string, name: string) => {
    setPatientId(id); setPatQuery(name); setShowPatDrop(false);
    const p = patients.find(p => p.id === id);
    setPatientAddress(p?.address || getLastKnownPatientAddress(id));
    setPatientCpf(p?.identityCard || lastKnownCpf(id));
    setPatientPhone(getLastKnownPatientPhone(id));
  };

  const isDraftComplete = !isRichTextEmpty(draft.text);

  const handleAddLine = () => {
    if (!isDraftComplete) return;
    setMedications(prev => [...prev, { ...draft, id: emptyLine().id }]);
    setDraft(emptyLine());
  };

  const handleRemoveLine = (id: string) => setMedications(prev => prev.filter(m => m.id !== id));
  const handleUpdateLine = (id: string, text: string) => setMedications(prev => prev.map(m => m.id === id ? { ...m, text } : m));

  const [signing, setSigning] = useState(false);

  const handleSave = async (action: 'save' | 'print' | 'sign-print') => {
    if (!patQuery.trim())     { alert(t('new_order_validation_pat'));  return; }
    if (!medications.length)  { alert(t('receta_validation_meds'));    return; }

    let fPid = patientId;
    let fPatient = selectedPatient;
    const trimmedAddress = patientAddress.trim();
    const trimmedCpf = patientCpf.trim();
    if (!fPid) {
      const matches = findPatientsByExactName(patients, patQuery, normName);
      if (matches.length > 1) { alert(t('patient_ambiguous_match')); return; }
      if (matches.length === 1) { fPid = matches[0].id; fPatient = matches[0]; }
      else {
        try {
          const created = await addPatient({ name: cleanName(patQuery), address: trimmedAddress || undefined, identityCard: trimmedCpf || undefined });
          fPid = created.id; fPatient = created;
        } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); return; }
      }
    }

    // Guarda dirección y CPF en el paciente para precargarlos en sus próximas
    // recetas. Se envían en UNA sola llamada partiendo de los datos vigentes
    // del paciente: dos llamadas con el mismo `fPatient` obsoleto pisaban
    // mutuamente el campo recién guardado por la otra (la segunda enviaba
    // address = null y borraba la dirección).
    if (fPatient) {
      const next: Patient = { ...fPatient };
      const addressChanged = trimmedAddress && trimmedAddress !== (fPatient.address || '');
      const cpfChanged = trimmedCpf && trimmedCpf !== (fPatient.identityCard || '');
      if (addressChanged) next.address = trimmedAddress;
      if (cpfChanged) next.identityCard = trimmedCpf;
      if (addressChanged || cpfChanged) {
        try { await updatePatient(next); } catch { /* no bloquea el guardado de la receta */ }
      }
    }

    const payload = {
      patientId: fPid, date: noDate ? undefined : (recetaDate.trim() || undefined),
      clinicName: clinicName.trim() || undefined,
      clinicSecretaria: clinicSecretaria.trim() || undefined,
      clinicSistema: clinicSistema.trim() || undefined,
      clinicAddress: clinicAddress.trim() || undefined,
      clinicPhone: clinicPhone.trim() || undefined,
      clinicCnpj: clinicCnpj.trim() || undefined,
      patientAddress: trimmedAddress || undefined,
      patientCpf: patientCpf.trim() || undefined,
      patientPhone: patientPhone.trim() || undefined,
      observations: isRichTextEmpty(observations) ? undefined : observations,
      medications,
    };

    try {
      let saved;
      if (isEdit && activeRecetaForEdit) {
        const upd = { ...activeRecetaForEdit, ...payload, createdBy: activeRecetaForEdit.createdBy };
        await updateReceta(upd); saved = upd; setActiveRecetaForEdit(null);
      } else {
        saved = await addReceta(payload);
      }
      if (action === 'print') {
        setRecetaPrintCopies(printTwoCopies ? 2 : 1);
        triggerDirectPrintReceta(saved);
      } else if (action === 'sign-print') {
        // Captura la plantilla real de impresión y la sube para firmar —
        // ver triggerSignAndPrint() en AppContext.tsx. Respeta la misma
        // preferencia de vías que "Imprimir" (antes se forzaba a 1 dentro
        // de triggerSignAndPrint sin importar este checkbox).
        setRecetaPrintCopies(printTwoCopies ? 2 : 1);
        setSigning(true);
        try {
          await triggerSignAndPrint('receta', saved);
        } catch (e) {
          alert(t('sign_pdf_error', { message: getErrorMessage(e) }));
        } finally {
          setSigning(false);
        }
      } else {
        alert(isEdit ? t('receta_success_edit') : t('receta_success'));
      }
      setCurrentView('recetas');
    } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); }
  };

  const handleCancel = () => { if (isEdit) setActiveRecetaForEdit(null); setCurrentView('recetas'); };

  const handleClear = () => {
    setClinicName('');
    setPatientId(''); setPatQuery(''); setPatientAddress('');
    setPatientCpf('');
    setPatientPhone('');
    setNoDate(false);
    setObservations(''); setMedications([]); setDraft(emptyLine());
  };

  return (
    <>
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
            {isEdit ? t('new_receta_edit_title') : t('new_receta_title')}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Bloque 1: Dados do Emitente ───────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Building2} title={t('receta_sec_emitter')} iconBg="bg-[#06B6D4]/8 border-[#06B6D4]/15" iconCls="text-[#06B6D4]" />
            <div className="p-6 space-y-4">
              <div>
                <FieldLabel optional optionalText={t("optional")}>{t('receta_emitter_prefeitura')}</FieldLabel>
                <ClinicProfileField
                  options={clinicOptions}
                  value={clinicName}
                  onValueChange={handleSelectClinic}
                />
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

          {/* ── Bloque 2: Dados do Paciente ───────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={User} title={t('receta_sec_patient')} />
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('pat_col_name')} *</label>
                  <div className="relative">
                    <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      className={`pl-10 pr-8 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 ${isEdit ? 'cursor-not-allowed text-slate-500' : ''}`}
                      placeholder={t('new_order_pat_search')}
                      value={patQuery}
                      readOnly={isEdit}
                      onChange={e => {
                        // No auto-vincula por nombre mientras se escribe/pega:
                        // el nombre no es único (puede haber dos pacientes
                        // distintos con el mismo nombre) y hacerlo en cada
                        // tecla/pegado terminaba asociando —y luego
                        // imprimiendo— datos de OTRO paciente sin que el Dr.
                        // lo notara. La vinculación real solo pasa al elegir
                        // una fila del desplegable (handleSelectPatient) o,
                        // si el nombre tecleado es inequívoco, al guardar
                        // (ver handleSave).
                        setPatQuery(e.target.value); setPatientId(''); setShowPatDrop(true);
                      }}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {t('new_order_date_label')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <div className="relative">
                    <Calendar size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input type="date"
                      disabled={noDate}
                      className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      value={recetaDate} onChange={e => setRecetaDate(e.target.value)} />
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel optional optionalText={t("optional")}>{t('receta_pat_address_label')}</FieldLabel>
                <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                  placeholder={t('receta_pat_address_placeholder')}
                  value={patientAddress} onChange={e => setPatientAddress(e.target.value)} />
              </div>

              <div>
                <FieldLabel optional optionalText={t("optional")}>{t('receta_pat_cpf_label')}</FieldLabel>
                <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                  placeholder={t('receta_pat_cpf_placeholder')}
                  value={patientCpf} onChange={e => setPatientCpf(e.target.value)} />
              </div>

              <div>
                <FieldLabel optional optionalText={t("optional")}>{t('patient_phone_label')}</FieldLabel>
                <Input type="tel" className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                  placeholder={t('patient_phone_placeholder')}
                  value={patientPhone} onChange={e => setPatientPhone(e.target.value)} />
              </div>

              {/* ── Opciones de impresión ─────────────────────────────── */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('receta_print_options_label')}</p>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={printTwoCopies}
                    onChange={e => setPrintTwoCopies(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-[#0F4C81]" />
                  <span className="text-sm font-semibold text-slate-700">{t('receta_print_two_copies')}</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={noDate}
                    onChange={e => handleToggleNoDate(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-[#0F4C81]" />
                  <span className="text-sm font-semibold text-slate-700">{t('receta_no_date_checkbox')}</span>
                </label>
              </div>
            </div>
          </PanelCard>

          {/* ── Bloque 3: Prescrição ─────────────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Pill} title={t('receta_sec_medications')} iconBg="bg-emerald-50 border-emerald-200" iconCls="text-emerald-600" />
            <div className="p-6 space-y-5">

              {/* Líneas agregadas */}
              {medications.length > 0 && (
                <div className="space-y-2">
                  {medications.map((m, idx) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => setSelectedMedication(m)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMedication(m); } }}
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <RichText
                        html={m.text}
                        className="flex-1 min-w-0 text-xs text-slate-700 leading-snug bg-white border border-slate-200 rounded-lg px-3 py-2 pointer-events-none"
                      />
                      <button type="button" onClick={e => { e.stopPropagation(); handleRemoveLine(m.id); }}
                        className="text-slate-300 hover:text-red-500 shrink-0 transition-colors mt-0.5" title={t('delete')}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Nueva línea — un solo párrafo con medicamento, presentación, posología, cantidad y unidad */}
              <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/40 space-y-3">
                <div className="relative">
                  <Label className="text-xs font-semibold text-slate-600">{t('receta_med_name_label')} *</Label>
                  <div className="relative">
                    <div
                      onClick={() => setDraftModalOpen(true)}
                      className="mt-1.5 pr-8 border border-slate-200 rounded-lg bg-white px-3 py-2 cursor-pointer text-sm leading-snug"
                      style={{ minHeight: '66px', color: '#1F2937' }}
                    >
                      {isRichTextEmpty(draft.text)
                        ? <span className="text-slate-400">{t('receta_med_paragraph_placeholder')}</span>
                        : <RichText html={draft.text} />}
                    </div>
                    {!isRichTextEmpty(draft.text) && (
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setDraft(d => ({ ...d, text: '' })); setShowMedDrop(false); }}
                        title={t('receta_med_clear_title')}
                        className="absolute right-2.5 top-4 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                    <Maximize2 size={10} />
                    {t('receta_med_expand_hint')}
                  </p>
                </div>
                <button type="button" onClick={handleAddLine}
                  disabled={!isDraftComplete}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#0F4C81] hover:bg-[#0a3a63] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors">
                  <PlusCircle size={13} /> {t('receta_med_add_btn')}
                </button>
              </div>

              <div>
                <FieldLabel optional optionalText={t("optional")}>{t('receta_obs_label')}</FieldLabel>
                <ExpandableRichField
                  value={observations}
                  onChange={setObservations}
                  placeholder={t('receta_obs_placeholder')}
                  modalTitle={t('receta_obs_label')}
                  style={{ minHeight: '58px' }}
                />
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
                    <div>
                      <p className="text-sm font-semibold text-slate-900 leading-tight">{patQuery}</p>
                      {patientId && selectedPatient && hasIdentity(selectedPatient.identityCard) && (
                        <p className="text-xs text-slate-400">{selectedPatient.identityCard}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">{t('receta_no_patient')}</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('date')}</p>
                <p className="text-sm font-semibold text-slate-900">{recetaDate || '—'}</p>
              </div>

              {clinicName && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('print_clinic_label')}</p>
                  <p className="text-sm font-semibold text-slate-900">{clinicName}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('receta_sec_medications')}</p>
                  {medications.length > 0 && (
                    <span className="text-[10px] font-bold text-white bg-[#0F4C81] px-2 py-0.5 rounded-full">{medications.length}</span>
                  )}
                </div>
                {medications.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">{t('receta_no_meds')}</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {medications.map(m => (
                      <div key={m.id} className="flex items-start gap-2 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0F4C81] mt-1.5 shrink-0" />
                        <p className="text-xs text-slate-700 leading-snug flex-1 line-clamp-2">{richTextToPlain(m.text)}</p>
                        <button type="button" onClick={() => handleRemoveLine(m.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
              {t('save_and_print')}
            </button>
            <button type="button" onClick={() => handleSave('sign-print')} disabled={signing}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50">
              <FileSignature size={16} className={signing ? 'animate-pulse' : ''} />
              {signing ? t('sign_print_loading') : t('save_sign_print')}
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
    {selectedMedication && (
      <MedicationModal
        open={true}
        onClose={() => setSelectedMedication(null)}
        medication={selectedMedication}
        onSave={handleUpdateLine}
        title={t('receta_med_modal_title')}
      />
    )}
    {draftModalOpen && createPortal(
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm animate-fade-in"
          onClick={() => setDraftModalOpen(false)}
        />
        {/* Acotado a 90vh con el editor haciendo scroll por dentro: sin esto un
            borrador largo empujaba el modal fuera de la ventana y, con el body
            en overflow:hidden, no había forma de llegar al texto. El body NO
            lleva overflow para no recortar el desplegable de medicamentos. */}
        <div className="relative w-full max-w-2xl z-10 bg-white rounded-2xl shadow-premium-lg border border-slate-200/60 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <Pill size={16} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{t('receta_med_modal_title')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('receta_med_modal_subtitle')}</p>
              </div>
            </div>
            <button
              onClick={() => setDraftModalOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-6 flex-1 min-h-0">
            <div className="relative">
              <RichTextField
                value={draft.text}
                onChange={html => { setDraft(d => ({ ...d, text: html })); loadVademecum(); setShowMedDrop(true); }}
                onBlur={() => setTimeout(() => setShowMedDrop(false), 150)}
                placeholder={t('receta_med_paragraph_placeholder')}
                autoFocus
                className="border border-slate-200 rounded-xl bg-slate-50/50 focus-within:border-[#0F4C81] focus-within:bg-white transition-colors"
                style={{
                  fontSize: '15px',
                  lineHeight: 1.7,
                  color: '#1F2937',
                  padding: '14px 16px',
                  minHeight: '40vh',
                  // El desplegable de medicamentos se ancla DEBAJO del editor,
                  // así que aquí se reserva además su alto (≈380px de cabecera
                  // + toolbar + padding + el propio desplegable) para que no
                  // lo recorte el overflow-hidden de la tarjeta.
                  maxHeight: 'max(40vh, calc(90vh - 380px))',
                  overflowY: 'auto',
                }}
              />
              {showMedDrop && medSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-premium-lg z-50 overflow-hidden">
                  <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                    {t('receta_med_vademecum_label')} — {medSuggestions.length}
                  </div>
                  <ul className="max-h-52 overflow-y-auto py-1">
                    {medSuggestions.map(name => (
                      <li key={name}>
                        <button type="button"
                          onMouseDown={() => { setDraft(d => ({ ...d, text: name })); setShowMedDrop(false); }}
                          className="w-full flex items-start px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                          <span className="text-xs text-slate-600 leading-snug">{name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button type="button" onClick={handleAddLine} disabled={!isDraftComplete}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0F4C81] hover:bg-[#0a3a63] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors">
                <PlusCircle size={14} /> {t('receta_med_add_btn')}
              </button>
              <button type="button" onClick={() => setDraftModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-colors">
                {t('med_modal_done')}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
  );
 };

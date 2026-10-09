import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import {
  User, Search, Calendar, Check, ArrowLeft, X,
  PlusCircle, ClipboardList, CheckCircle2,
  Stethoscope, FileText, Send, FileSignature, Trash2,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { ExpandableRichField } from '../components/ExpandableRichField';
import { ClinicProfileField } from '../components/ClinicProfileField';
import { encUi } from '../data/encaminhamentoProfiles';
import { cn, findPatientsByExactName, getErrorMessage, hasIdentity } from '../lib/utils';
import { EditPatientNameButton } from '../components/EditPatientNameButton';
import { findClinicProfile } from '../lib/clinic';
import { isRichTextEmpty } from '../lib/richText';

const PanelCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('bg-white rounded-2xl border border-slate-200/80 shadow-premium', className)}>
    {children}
  </div>
);

const PanelCardHead = ({
  icon: Icon, title, iconBg, iconCls, children,
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

export const NewEncaminhamento: React.FC = () => {
  const { t } = useTranslation();
  const {
    patients, addPatient,
    setCurrentView, activeEncaminhamentoForEdit, setActiveEncaminhamentoForEdit,
    triggerDirectPrintEncaminhamento, triggerSignAndPrint, addEncaminhamento, updateEncaminhamento,
    specialistsCatalog, addSpecialist, deleteSpecialist,
    lastClinicName, setLastClinicName, clinicProfiles,
    activeEncProfile, setActiveEncProfile,
    getLastKnownPatientPhone,
  } = useApp();

  const isEdit = !!activeEncaminhamentoForEdit;
  const ui = encUi(activeEncProfile);

  const [patientId,   setPatientId]   = useState('');
  const [patQuery,    setPatQuery]    = useState('');
  const [showPatDrop, setShowPatDrop] = useState(false);
  const [encDate,     setEncDate]     = useState('');
  const [noDate,      setNoDate]      = useState(false);
  const [patientAge,  setPatientAge]  = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [hd,          setHd]          = useState('');
  const [motivo,      setMotivo]      = useState('');
  const [clinicName,  setClinicName]  = useState(lastClinicName);
  const [selectedSpecialists, setSelectedSpecialists] = useState<string[]>([]);
  const [newSpecialistName,   setNewSpecialistName]   = useState('');
  const [signing, setSigning] = useState(false);

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

  // Cada clínica maneja su propio historial de pacientes: en NEUROISBE solo
  // aparecen los pacientes de NEUROISBE; en NEUROMOBIUS los suyos (los antiguos
  // sin origen se consideran de NEUROMOBIUS).
  const filteredPatients = useMemo(() => {
    if (!patQuery.trim()) return [];
    const q = patQuery.toLowerCase();
    return patients.filter(p => {
      const pOrigin = p.origin ?? 'neuromobius';
      if (pOrigin !== activeEncProfile) return false;
      return p.name.toLowerCase().includes(q) || (p.identityCard || '').includes(q);
    });
  }, [patients, patQuery, activeEncProfile]);

  // Prefill en modo edición
  useEffect(() => {
    if (activeEncaminhamentoForEdit) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the whole form from the edit target; too many fields to safely move to render-phase
      setPatientId(activeEncaminhamentoForEdit.patientId);
      const p = patients.find(p => p.id === activeEncaminhamentoForEdit.patientId);
      if (p) setPatQuery(p.name);
      setEncDate(activeEncaminhamentoForEdit.date || '');
      setNoDate(!activeEncaminhamentoForEdit.date);
      setPatientAge(activeEncaminhamentoForEdit.patientAge || '');
      setPatientPhone(activeEncaminhamentoForEdit.patientPhone || getLastKnownPatientPhone(activeEncaminhamentoForEdit.patientId));
      setHd(activeEncaminhamentoForEdit.hd || '');
      setMotivo(activeEncaminhamentoForEdit.motivo || '');
      setClinicName(activeEncaminhamentoForEdit.clinicName || '');
      setSelectedSpecialists(activeEncaminhamentoForEdit.specialists || []);
    } else {
      const now = new Date();
      setEncDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setNoDate(false);
      setPatientAge('');
      setPatientPhone('');
      setHd('');
      setMotivo('');
      // clinicName NO se resetea acá: ya se inicializa con useState(lastClinicName)
      // al montar. Incluir lastClinicName como dependencia hacía que seleccionar
      // una clínica (handleSelectClinic → setLastClinicName) re-disparara este
      // efecto y borrara todo lo ya cargado (edad, teléfono, HD, motivo,
      // especialistas). Igual que NewOrder/NewReceta/NewAtestado, que no lo incluyen.
      setSelectedSpecialists([]);
    }
  }, [activeEncaminhamentoForEdit, patients, getLastKnownPatientPhone]);

  // Al editar un documento, la pestaña activa pas a reflejar su perfil original.
  useEffect(() => {
    if (activeEncaminhamentoForEdit?.templateId) {
      setActiveEncProfile(activeEncaminhamentoForEdit.templateId);
    }
  }, [activeEncaminhamentoForEdit, setActiveEncProfile]);

  const handleToggleNoDate = (checked: boolean) => {
    setNoDate(checked);
    if (checked) {
      setEncDate('');
    } else if (!encDate) {
      const now = new Date();
      setEncDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    }
  };

  const selectedPatient = patients.find(p => p.id === patientId);

  const handleSelectPatient = (id: string, name: string) => {
    setPatientId(id); setPatQuery(name); setShowPatDrop(false);
    setPatientPhone(prev => prev.trim() ? prev : getLastKnownPatientPhone(id));
  };

  const toggleSpecialist = (id: string) =>
    setSelectedSpecialists(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreateSpecialist = async () => {
    const name = newSpecialistName.trim(); if (!name) return;
    try {
      const created = await addSpecialist(name, activeEncProfile);
      setSelectedSpecialists(prev => [...prev, created.id]);
      setNewSpecialistName('');
    } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); }
  };

  const handleDeleteSpecialist = async (id: string, name: string) => {
    if (!confirm(t('encaminhamento_specialist_delete_confirm', { name }))) return;
    try {
      await deleteSpecialist(id);
      setSelectedSpecialists(prev => prev.filter(x => x !== id));
    } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); }
  };

  const handleSave = async (action: 'save' | 'print' | 'sign-print') => {
    if (!patQuery.trim())            { alert(t('new_order_validation_pat'));         return; }
    if (!selectedSpecialists.length) { alert(t('encaminhamento_validation_specs'));   return; }

    let fPid = patientId;
    if (!fPid) {
      const matches = findPatientsByExactName(
        patients.filter(p => (p.origin ?? 'neuromobius') === activeEncProfile),
        patQuery,
      );
      if (matches.length > 1) { alert(t('patient_ambiguous_match')); return; }
      if (matches.length === 1) { fPid = matches[0].id; }
      else {
        try {
          const created = await addPatient({ name: patQuery.trim(), origin: activeEncProfile });
          fPid = created.id;
        } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); return; }
      }
    }

    const payload = {
      patientId: fPid, date: noDate ? undefined : (encDate.trim() || undefined),
      patientAge: patientAge.trim() || undefined,
      patientPhone: patientPhone.trim() || undefined,
      hd: hd.trim() || undefined,
      motivo: isRichTextEmpty(motivo) ? undefined : motivo,
      clinicName: clinicName.trim() || undefined,
      clinicSecretaria: clinicSecretaria.trim() || undefined,
      clinicSistema: clinicSistema.trim() || undefined,
      clinicAddress: clinicAddress.trim() || undefined,
      clinicPhone: clinicPhone.trim() || undefined,
      clinicCnpj: clinicCnpj.trim() || undefined,
      templateId: activeEncProfile,
      specialists: selectedSpecialists,
    };

    try {
      let saved;
      if (isEdit && activeEncaminhamentoForEdit) {
        const upd = { ...activeEncaminhamentoForEdit, ...payload, createdBy: activeEncaminhamentoForEdit.createdBy };
        await updateEncaminhamento(upd); saved = upd; setActiveEncaminhamentoForEdit(null);
      } else {
        saved = await addEncaminhamento(payload);
      }
      if (action === 'print') {
        triggerDirectPrintEncaminhamento(saved);
      } else if (action === 'sign-print') {
        setSigning(true);
        try {
          await triggerSignAndPrint('encaminhamento', saved);
        } catch (e) {
          alert(t('sign_pdf_error', { message: getErrorMessage(e) }));
        } finally {
          setSigning(false);
        }
      } else {
        alert(isEdit ? t('encaminhamento_success_edit') : t('encaminhamento_success'));
      }
      setCurrentView('encaminhamentos');
    } catch (e) { alert(t('save_error_msg', { message: getErrorMessage(e) })); }
  };

  const handleCancel = () => { if (isEdit) setActiveEncaminhamentoForEdit(null); setCurrentView('encaminhamentos'); };

  const handleClear = () => {
    setPatientId(''); setPatQuery('');
    setNoDate(false);
    setPatientAge(''); setPatientPhone(''); setHd(''); setMotivo(''); setClinicName('');
    setSelectedSpecialists([]);
  };

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
            {isEdit ? t('new_encaminhamento_edit_title') : t('new_encaminhamento_title')}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Bloque 1: Especialistas ──────────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Stethoscope} title={t('encaminhamento_sec_specialists')} iconBg={ui.iconBox} iconCls={ui.iconCls} />
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {specialistsCatalog.map(s => {
                  const checked = selectedSpecialists.includes(s.id);
                  return (
                    <div key={s.id} className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all',
                      checked
                        ? ui.checkedOption
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    )}>
                      <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSpecialist(s.id)}
                          className={cn('w-4 h-4 rounded cursor-pointer shrink-0', ui.accentInput)}
                        />
                        <span className="leading-snug truncate">{s.name}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleDeleteSpecialist(s.id, s.name)}
                        title={t('encaminhamento_specialist_delete_btn')}
                        className="p-1 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1">
                <Input
                  className="h-9 text-sm border-slate-200 bg-slate-50/50 focus:bg-white"
                  placeholder={t('encaminhamento_specialist_placeholder')}
                  value={newSpecialistName}
                  onChange={e => setNewSpecialistName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSpecialist(); } }}
                />
                <button type="button" onClick={handleCreateSpecialist}
                  className={`flex items-center gap-1.5 px-3 py-2 ${ui.solidBtn} text-white text-xs font-bold rounded-xl transition-colors shrink-0`}>
                  <PlusCircle size={13} /> {t('encaminhamento_specialist_add_btn')}
                </button>
              </div>
            </div>
          </PanelCard>

          {/* ── Bloque 2: Dados do Paciente ───────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={User} title={t('receta_sec_patient')} iconBg={ui.iconBox} iconCls={ui.iconCls} />
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">{t('pat_col_name')} *</label>
                  <div className="relative">
                    <Search size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      className={`pl-10 pr-8 h-11 border-slate-200 bg-slate-50/50 focus:bg-white ${ui.focusBorder} ${isEdit ? 'cursor-not-allowed text-slate-500' : ''}`}
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
                          <div className={`w-8 h-8 rounded-lg ${ui.avatar} flex items-center justify-center text-xs font-bold shrink-0`}>
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
                    {t('encaminhamento_age_label')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <Input className={`h-11 border-slate-200 bg-slate-50/50 focus:bg-white ${ui.focusBorder}`}
                    placeholder={t('encaminhamento_age_placeholder')}
                    value={patientAge} onChange={e => setPatientAge(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  {t('patient_phone_label')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <Input type="tel" className={`h-11 border-slate-200 bg-slate-50/50 focus:bg-white ${ui.focusBorder}`}
                  placeholder={t('patient_phone_placeholder')}
                  value={patientPhone} onChange={e => setPatientPhone(e.target.value)} />
              </div>

              {/* Clínica / Institución */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {t('date')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <div className="relative">
                    <Calendar size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input type="date"
                      disabled={noDate}
                      className={`pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white ${ui.focusBorder} disabled:opacity-50 disabled:cursor-not-allowed`}
                      value={encDate} onChange={e => setEncDate(e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2.5 mt-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={noDate}
                      onChange={e => handleToggleNoDate(e.target.checked)}
                      className={cn('w-5 h-5 rounded cursor-pointer', ui.accentInput)} />
                    <span className="text-sm font-semibold text-slate-700">{t('receta_no_date_checkbox')}</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                    <FileText size={12} /> {t('encaminhamento_hd_label')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <Input className={`h-11 border-slate-200 bg-slate-50/50 focus:bg-white ${ui.focusBorder}`}
                    placeholder={t('encaminhamento_hd_placeholder')}
                    value={hd} onChange={e => setHd(e.target.value)} />
                </div>
              </div>
            </div>
          </PanelCard>

          {/* ── Bloque 3: Encaminhamento ─────────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Send} title={t('encaminhamento_sec_motivo')} iconBg={ui.iconBox} iconCls={ui.iconCls} />
            <div className="p-6 space-y-2">
              <p className="text-xs text-slate-500 italic">{t('encaminhamento_fixed_text')}</p>
              <ExpandableRichField
                value={motivo}
                onChange={setMotivo}
                placeholder={t('encaminhamento_motivo_placeholder')}
                modalTitle={t('encaminhamento_sec_motivo')}
                className="border border-slate-200 bg-slate-50/50 hover:border-[#0F4C81] transition-colors"
                style={{ minHeight: '150px' }}
              />
            </div>
          </PanelCard>

        </div>

        {/* ── Columna derecha — Resumen sticky ─────────────────────────── */}
        <div className="lg:col-span-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto space-y-4">
          <PanelCard>
            <PanelCardHead icon={ClipboardList} title={t('receta_sec_summary')} iconBg={ui.iconBox} iconCls={ui.iconCls} />
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('pat_col_name')}</p>
                {patQuery.trim() ? (
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${ui.avatar} flex items-center justify-center text-xs font-bold shrink-0`}>
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
                <p className="text-sm font-semibold text-slate-900">{encDate || '—'}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('encaminhamento_sec_specialists')}</p>
                  {selectedSpecialists.length > 0 && (
                    <span className={`text-[10px] font-bold text-white ${ui.solidBadge} px-2 py-0.5 rounded-full`}>{selectedSpecialists.length}</span>
                  )}
                </div>
                {selectedSpecialists.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">{t('encaminhamento_no_specialists')}</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {selectedSpecialists.map(sid => {
                      const spec = specialistsCatalog.find(s => s.id === sid);
                      return (
                        <div key={sid} className="flex items-start gap-2 group">
                          <div className={`w-1.5 h-1.5 rounded-full ${ui.dot} mt-1.5 shrink-0`} />
                          <p className="text-xs text-slate-700 leading-snug flex-1">{spec?.name ?? sid}</p>
                          <button type="button" onClick={() => toggleSpecialist(sid)}
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

          <div className="space-y-2">
            <button type="button" onClick={() => handleSave('save')}
              className={`flex items-center justify-center gap-2 w-full h-12 rounded-xl ${ui.solidBtn} text-white text-sm font-bold shadow-sm hover:shadow-md transition-all`}>
              <Check size={17} strokeWidth={2.5} />
              {t('save')}
            </button>
            <button type="button" onClick={() => handleSave('print')}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all">
              {t('save_and_print')}
            </button>
            <button type="button" onClick={() => handleSave('sign-print')} disabled={signing}
              className={`flex items-center justify-center gap-2 w-full h-11 rounded-xl ${ui.solidBtn} text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50`}>
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
  );
};

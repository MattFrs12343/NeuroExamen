import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { LaudoConclusao, Laudo as LaudoDoc, LaudoClinicProfile, LaudoConclusaoOption } from '../types';
import { ArrowLeft, Printer, FileSignature, Scale, RefreshCw, Search, X, Phone, Pencil, PlusCircle, Trash2, Upload, Check, Building2, Maximize2 } from 'lucide-react';
import { ClinicProfileField } from '../components/ClinicProfileField';
import { Input } from '../components/ui/input';
import { RichTextField } from '../components/ui/rich-text-field';
import { ExpandableRichField } from '../components/ExpandableRichField';
import { RichText } from '../components/RichText';
import { findClinicProfile, normalizeClinicKey } from '../lib/clinic';
import { getLaudoOwnProfile, getLaudoProfileFor, laudoTituloI18nKey } from '../lib/laudoClinic';
import { cn, getErrorMessage } from '../lib/utils';
import { isRichTextEmpty } from '../lib/richText';
import { printSignedPdf } from '../lib/signedPdf';

// Fecha local (no UTC) — toISOString() usa UTC y puede mostrar el día
// anterior/siguiente cerca de la medianoche según el huso horario.
const todayLocalStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Id de la conclusión que venía marcada por defecto antes de que el catálogo
// fuera administrable. Se usa como default solo si el catálogo la tiene.
const DEFAULT_CONCLUSAO = 'inapto_temporario';

export const NewLaudo: React.FC = () => {
  const { t } = useTranslation();
  const {
    setCurrentView, patients, clinicProfiles, laudoClinics,
    triggerDirectPrintLaudo, addLaudo, updateLaudo,
    activeLaudoForEdit, setActiveLaudoForEdit,
    saveLaudoClinicProfile, lastClinicName, setLastClinicName,
    laudoConclusoesCatalog, addLaudoConclusao, renameLaudoConclusao, deleteLaudoConclusao,
    signPrintBusy, setSignPrintBusy,
  } = useApp();

  const isEdit = !!activeLaudoForEdit;

  const [clinicKey, setClinicKey] = useState(() => normalizeClinicKey(lastClinicName));
  const [patientName, setPatientName] = useState('');
  const [orgao, setOrgao] = useState('');
  const [patientIdentityCard, setPatientIdentityCard] = useState('');
  const [patientBirthDate, setPatientBirthDate] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [date, setDate] = useState(() => todayLocalStr());
  const [local, setLocal] = useState('');
  const [narrative, setNarrative] = useState('');
  const [tituloTipo, setTituloTipo] = useState<'pericial' | 'medico'>('pericial');
  const [cids, setCids] = useState('');
  const [conclusao, setConclusao] = useState<LaudoConclusao | ''>(DEFAULT_CONCLUSAO);
  // Alta/edición/baja del catálogo de conclusiones (ver handle*Conclusao)
  const [newConclusaoLabel, setNewConclusaoLabel] = useState('');
  const [editingConclusaoId, setEditingConclusaoId] = useState<string | null>(null);
  const [editingConclusaoLabel, setEditingConclusaoLabel] = useState('');
  const [savingConclusao, setSavingConclusao] = useState(false);
  const [afastamentoDias, setAfastamentoDias] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [showPatDrop, setShowPatDrop] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [signing, setSigning] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editor del perfil de laudo por clínica (logo, firma del médico, base info...)
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<LaudoClinicProfile>>({});
  const logoInputRef = useRef<HTMLInputElement>(null);
  const LOGO_MAX_BYTES = 1_500_000;

  // Modal de narrativa expandida: esc bloquea el scroll del fondo mientras
  // está abierto y devuelve la vista al modal (por si el usuario tocó scroll
  // en el textarea grande y después pulsó Esc para cerrar).
  const [narrativeModalOpen, setNarrativeModalOpen] = useState(false);
  const narrativeModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    const restore = () => { document.body.style.overflow = prev; };

    if (!narrativeModalOpen) { restore(); return; }

    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNarrativeModalOpen(false); };
    window.addEventListener('keydown', onKey);
    const raf = requestAnimationFrame(() => narrativeModalRef.current?.scrollIntoView({ block: 'center' }));
    return () => { window.removeEventListener('keydown', onKey); cancelAnimationFrame(raf); restore(); };
  }, [narrativeModalOpen]);

  // Perfiles de la clínica elegida: el catálogo de clínicas (receta_clinics)
  // y el perfil de laudo específico (laudo_clinics, solo si la clínica tiene
  // uno — getLaudoOwnProfile ignora las filas vacías sin datos de laudo).
  const recetaProfile = useMemo(() => findClinicProfile(clinicProfiles, clinicKey), [clinicProfiles, clinicKey]);
  const laudoProfile  = useMemo(() => getLaudoOwnProfile(laudoClinics, clinicKey), [laudoClinics, clinicKey]);
  // Formato del laudo: el perfil PROPIO de la clínica si existe; si no, el de
  // CLINICA SAUDE CAMPINAS (perfil por defecto — mismas firma/base info/
  // narrativa base, con nombre/dirección/teléfono de esta clínica; el logo NO
  // se hereda, cada clínica usa el suyo propio o sale sin logo).
  const profileDisplay = useMemo(() => getLaudoProfileFor(laudoClinics, clinicKey), [laudoClinics, clinicKey]);

  const clinicLabel = laudoProfile?.clinicNameFiscal || recetaProfile?.name || clinicKey;

  // Precarga los campos al editar un laudo existente (viene de LaudosList.tsx).
  useEffect(() => {
    if (!activeLaudoForEdit) return;
    // templateId guarda hoy el NOMBRE de la clínica elegida en el dropdown.
    // Laudos creados antes de la generalización por clínica guardaban la key
    // interna 'clinica_saude_campinas' — se mapea al nombre público para que
    // la clínica siga apareciendo seleccionada al editarlos. SIEMPRE se
    // normaliza (igual que handleSelectClinic) antes de guardarlo en
    // clinicKey: guardar el nombre crudo acá corrompía template_id en cada
    // edición (ej.: "CLINICA SAUDE CAMPINAS" con mayúsculas/espacios en vez
    // de la key normalizada), rompiendo el matching de logo/base info del
    // lado del servidor (server-php/lib/laudoProfiles.php).
    const clinicKeyOf = activeLaudoForEdit.templateId === 'clinica_saude_campinas'
      ? normalizeClinicKey('CLINICA SAUDE CAMPINAS')
      : normalizeClinicKey(activeLaudoForEdit.templateId || activeLaudoForEdit.clinicName || '');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the whole form from the edit target
    setClinicKey(clinicKeyOf);
    setPatientName(activeLaudoForEdit.patientName || '');
    setOrgao(activeLaudoForEdit.orgao || '');
    setPatientIdentityCard(activeLaudoForEdit.patientIdentityCard || '');
    setPatientBirthDate(activeLaudoForEdit.patientBirthDate || '');
    setPatientPhone(activeLaudoForEdit.patientPhone || '');
    setDate(activeLaudoForEdit.date || todayLocalStr());
    setLocal(activeLaudoForEdit.local || '');
    setNarrative(activeLaudoForEdit.narrative || '');
    setTituloTipo(activeLaudoForEdit.tituloTipo === 'medico' ? 'medico' : 'pericial');
    setCids(activeLaudoForEdit.cids || activeLaudoForEdit.diagnostico || '');
    setConclusao(activeLaudoForEdit.conclusao || '');
    setAfastamentoDias(activeLaudoForEdit.afastamentoDias ? String(activeLaudoForEdit.afastamentoDias) : '');
    setObservacoes(activeLaudoForEdit.observacoes || '');
  }, [activeLaudoForEdit]);

  const filteredPatients = useMemo(() => {
    if (!patientName.trim()) return [];
    const q = patientName.trim().toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [patients, patientName]);

  /**
   * Opciones a mostrar: el catálogo administrable, más la opción elegida si ya
   * no está en el catálogo (puede pasar al editar un laudo viejo cuya opción
   * fue borrada) — el snapshot del laudo la conserva, así que se muestra con
   * su texto original en vez de dejar el radio sin marcar.
   */
  const conclusaoOptions = useMemo<LaudoConclusaoOption[]>(() => {
    const list = [...laudoConclusoesCatalog];
    if (conclusao && !list.some(o => o.id === conclusao)) {
      const snap = activeLaudoForEdit?.conclusaoOpcoes?.find(o => o.id === conclusao);
      if (snap) list.push(snap);
    }
    return list;
  }, [laudoConclusoesCatalog, conclusao, activeLaudoForEdit]);

  const handleCreateConclusao = async () => {
    const label = newConclusaoLabel.trim();
    if (!label) return;
    setSavingConclusao(true);
    try {
      const created = await addLaudoConclusao(label);
      setNewConclusaoLabel('');
      setConclusao(created.id);
    } catch (e) {
      alert(t('save_error_msg', { message: getErrorMessage(e) }));
    } finally {
      setSavingConclusao(false);
    }
  };

  const openEditConclusao = (opt: LaudoConclusaoOption) => {
    setEditingConclusaoId(opt.id);
    setEditingConclusaoLabel(opt.label);
  };

  const handleSaveConclusaoEdit = async () => {
    if (!editingConclusaoId) return;
    const label = editingConclusaoLabel.trim();
    if (!label) { setEditingConclusaoId(null); return; }
    setSavingConclusao(true);
    try {
      await renameLaudoConclusao(editingConclusaoId, label);
      setEditingConclusaoId(null);
    } catch (e) {
      alert(t('save_error_msg', { message: getErrorMessage(e) }));
    } finally {
      setSavingConclusao(false);
    }
  };

  const handleDeleteConclusao = async (opt: LaudoConclusaoOption) => {
    if (!confirm(t('laudo_conclusao_delete_confirm', { label: opt.label }))) return;
    setSavingConclusao(true);
    try {
      await deleteLaudoConclusao(opt.id);
      if (conclusao === opt.id) setConclusao('');
      if (editingConclusaoId === opt.id) setEditingConclusaoId(null);
    } catch (e) {
      alert(t('save_error_msg', { message: getErrorMessage(e) }));
    } finally {
      setSavingConclusao(false);
    }
  };

  const handleSelectClinic = (name: string) => {
    const key = normalizeClinicKey(name);
    setClinicKey(key);
    setLastClinicName(name); // global shared (display name)
    const display = getLaudoProfileFor(laudoClinics, name);
    setLocal(display?.local || '');
    // La narrativa base (texto estándar del laudo pericial) se precarga desde
    // el perfil de la clínica — el Dr. la ajusta/expande por paciente.
    if (!narrative) setNarrative(display?.defaultNarrative || '');
  };

  const handleChangeClinic = () => {
    setClinicKey('');
    setLastClinicName('');
    setLocal('');
    setNarrative('');
    setTituloTipo('pericial');
    setCids('');
    setObservacoes('');
    setAfastamentoDias('');
    setPatientName('');
    setOrgao('');
    setPatientIdentityCard('');
    setPatientBirthDate('');
    setPatientPhone('');
    setShowPatDrop(false);
    setActiveLaudoForEdit(null);
  };

  const clinicSnapshot = () => {
    if (!clinicKey) return {};
    return {
      // Nombre/dirección/teléfono SIEMPRE de esta clínica (perfil propio si lo
      // tiene, si no del catálogo receta_clinics). El doctor/base info vienen
      // del formato por defecto cuando no hay perfil propio.
      clinicName: laudoProfile?.clinicNameFiscal || recetaProfile?.name || clinicKey,
      clinicAddress: laudoProfile?.clinicAddress || recetaProfile?.address,
      clinicPhone: laudoProfile?.clinicPhone || recetaProfile?.phone,
      doctorName: (laudoProfile ?? profileDisplay)?.doctorName,
      doctorCrm: (laudoProfile ?? profileDisplay)?.doctorCrm,
    };
  };

  // ── Editor del perfil de laudo ────────────────────────────────────────────
  // El perfil de una clínica aplica a TODOS los laudos de esa clínica (firma,
  // membrete, base info, narrativa por defecto). Se guarda vía
  // POST /api/laudo-clinics y el GET se refresca para actualizar la preview.
  const openProfileEditor = () => {
    setProfileForm({
      doctorName: laudoProfile?.doctorName || '',
      doctorCrm: laudoProfile?.doctorCrm || '',
      clinicNameFiscal: laudoProfile?.clinicNameFiscal || '',
      clinicAddress: laudoProfile?.clinicAddress || '',
      clinicPhone: laudoProfile?.clinicPhone || '',
      baseInfo: laudoProfile?.baseInfo || '',
      defaultNarrative: laudoProfile?.defaultNarrative || '',
      local: laudoProfile?.local || '',
      logo: laudoProfile?.logo || null,
    });
    setShowProfileEditor(true);
  };

  const setProfileField = (key: keyof LaudoClinicProfile, val: string) =>
    setProfileForm(f => ({ ...f, [key]: val }));

  const handleLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > LOGO_MAX_BYTES) { alert(t('laudo_profile_logo_size_msg')); return; }
    const reader = new FileReader();
    reader.onload = () => setProfileForm(f => ({ ...f, logo: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!clinicKey) return;
    setSavingProfile(true);
    try {
      await saveLaudoClinicProfile({
        ...profileForm,
        name: clinicKey,
        primaryColor: laudoProfile?.primaryColor || '#0F4C81',
        primaryDark: laudoProfile?.primaryDark || '#0a3a63',
      });
      alert(t('laudo_profile_saved'));
      setShowProfileEditor(false);
    } catch (err) {
      alert(t('save_error_msg', { message: getErrorMessage(err) }));
    } finally {
      setSavingProfile(false);
    }
  };

  // La conclusión por defecto se setea antes de que llegue el catálogo: si esa
  // opción ya no existe (el médico la borró), o el catálogo todavía no cargó,
  // el id no está en la lista visible y no debe mandarse — si fuera, el PDF
  // imprimiría los checkboxes sin ninguno marcado.
  const conclusaoValida = conclusao && conclusaoOptions.some(o => o.id === conclusao) ? conclusao : '';

  const laudoData = {
    templateId: clinicKey || undefined,
    ...clinicSnapshot(),
    patientName: patientName.trim(),
    orgao: orgao.trim() || undefined,
    patientIdentityCard: patientIdentityCard.trim() || undefined,
    patientBirthDate: patientBirthDate || undefined,
    patientPhone: patientPhone.trim() || undefined,
    date: date || undefined,
    local: local.trim() || laudoProfile?.local || undefined,
    narrative,
    tituloTipo,
    cids: cids.trim() || undefined,
    conclusao: conclusaoValida || undefined,
    // Se manda la lista completa: la API la guarda como snapshot para que el
    // PDF firmado no cambie si después se edita o borra una opción.
    conclusaoOpcoes: conclusaoValida ? conclusaoOptions : undefined,
    afastamentoDias: afastamentoDias ? Number(afastamentoDias) : undefined,
    observacoes: isRichTextEmpty(observacoes) ? undefined : observacoes,
  };

  // Guarda los cambios sin imprimir ni (re)firmar — para ediciones simples
  // (ej.: tocar la Conclusão Pericial) sin generar un PDF firmado nuevo cada
  // vez. "Imprimir" y "Guardar e assinar" también guardan, pero siempre
  // abren un diálogo de impresión/firma detrás.
  const handleSaveOnly = async () => {
    if (!patientName.trim()) { alert(t('laudo_validation_specs')); return; }
    setSaving(true);
    try {
      if (isEdit && activeLaudoForEdit) {
        const updated: LaudoDoc = { ...activeLaudoForEdit, ...laudoData };
        await updateLaudo(updated);
        setActiveLaudoForEdit(null);
        alert(t('laudo_success_edit'));
      } else {
        await addLaudo(laudoData);
        alert(t('laudo_success'));
      }
      setCurrentView('laudos');
    } catch (e) {
      alert(t('save_error_msg', { message: getErrorMessage(e) }));
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!patientName.trim()) { alert(t('laudo_validation_specs')); return; }
    setPrinting(true);
    try {
      if (isEdit && activeLaudoForEdit) {
        const updated: LaudoDoc = { ...activeLaudoForEdit, ...laudoData };
        await updateLaudo(updated);
        triggerDirectPrintLaudo(updated);
        setActiveLaudoForEdit(null);
      } else {
        const saved = await addLaudo(laudoData);
        triggerDirectPrintLaudo({ ...saved, ...laudoData });
      }
    } catch (e) {
      alert(t('save_error_msg', { message: getErrorMessage(e) }));
    } finally {
      setPrinting(false);
    }
  };

  const handleSignPrint = async () => {
    if (!patientName.trim()) { alert(t('laudo_validation_specs')); return; }
    if (signPrintBusy) return;
    setSigning(true);
    setSignPrintBusy(true);
    try {
      // El PDF firmado lo arma el servidor DE CERO a partir de la fila en
      // la base (ver api/laudos/signed-pdf.php — TCPDF, no captura del
      // navegador), así que acá alcanza con guardar y pedirle el id; no
      // hace falta mandarle el record completo como antes.
      let id: string;
      if (isEdit && activeLaudoForEdit) {
        const updated: LaudoDoc = { ...activeLaudoForEdit, ...laudoData };
        await updateLaudo(updated);
        id = updated.id;
      } else {
        const saved = await addLaudo(laudoData);
        id = saved.id;
      }
      await printSignedPdf('laudos', id);
      setActiveLaudoForEdit(null);
    } catch (e) {
      alert(t('sign_pdf_error', { message: getErrorMessage(e) }));
    } finally {
      setSigning(false);
      setSignPrintBusy(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setActiveLaudoForEdit(null); setCurrentView('laudos'); }}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('nav_laudos')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('laudo_desc')}</p>
        </div>
      </div>

      {!clinicKey ? (
        /* ── Paso 1: elegir clínica ────────────────────────────────────── */
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-premium p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-[#0F4C81]/8 border border-[#0F4C81]/15 flex items-center justify-center mx-auto">
            <Scale size={22} className="text-[#0F4C81]" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('laudo_select_clinic_title')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('laudo_select_clinic_desc')}</p>
          </div>
          <div className="text-left">
            <ClinicProfileField
              options={clinicProfiles}
              value={clinicKey}
              onValueChange={handleSelectClinic}
            />
          </div>
        </div>
      ) : (
        /* ── Paso 2: hoja editable ─────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Scale size={15} className="text-[#0F4C81]" />
              <span className="truncate">{clinicLabel}</span>
              {profileDisplay?.doctorCrm && (
                <span className="text-xs font-medium text-slate-400 shrink-0">— {profileDisplay.doctorCrm}</span>
              )}
              {!laudoProfile && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#0F4C81]/70 bg-[#0F4C81]/8 border border-[#0F4C81]/15 rounded-full px-2 py-0.5 shrink-0">
                  {t('laudo_profile_default_badge')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <button type="button" onClick={openProfileEditor}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0F4C81] transition-colors">
                <Pencil size={13} />
                {t('laudo_profile_edit_btn')}
              </button>
              <button type="button" onClick={handleChangeClinic}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0F4C81] transition-colors">
                <RefreshCw size={13} />
                {t('laudo_change_clinic_btn')}
              </button>
            </div>
          </div>

          {/* Editor del perfil de laudo de la clínica elegida */}
          {showProfileEditor && (
            <div className="max-w-3xl mx-auto w-full rounded-2xl border border-slate-200 bg-white shadow-premium p-5 space-y-4 animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t('laudo_profile_title')}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t('laudo_profile_desc')}</p>
                </div>
                <button type="button" onClick={() => setShowProfileEditor(false)} className="text-slate-400 hover:text-slate-600 shrink-0">
                  <X size={15} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('laudo_profile_doctor_label')}</label>
                  <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    value={profileForm.doctorName || ''} onChange={e => setProfileField('doctorName', e.target.value)}
                    placeholder="DR. NOMBRE APELLIDO" autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('laudo_profile_crm_label')}</label>
                  <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    value={profileForm.doctorCrm || ''} onChange={e => setProfileField('doctorCrm', e.target.value)}
                    placeholder="CRM: 000000/UF" autoComplete="off" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('laudo_profile_fiscal_label')}</label>
                  <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    value={profileForm.clinicNameFiscal || ''} onChange={e => setProfileField('clinicNameFiscal', e.target.value)}
                    autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('laudo_profile_address_label')}</label>
                  <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    value={profileForm.clinicAddress || ''} onChange={e => setProfileField('clinicAddress', e.target.value)}
                    autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('laudo_profile_phone_label')}</label>
                  <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    value={profileForm.clinicPhone || ''} onChange={e => setProfileField('clinicPhone', e.target.value)}
                    autoComplete="off" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('laudo_profile_local_label')}</label>
                  <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    value={profileForm.local || ''} onChange={e => setProfileField('local', e.target.value)}
                    placeholder="Campinas - SP" autoComplete="off" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('laudo_profile_base_info_label')}</label>
                <RichTextField
                  value={profileForm.baseInfo || ''}
                  onChange={html => setProfileField('baseInfo', html)}
                  placeholder={t('laudo_profile_base_info_placeholder')}
                  className="border border-slate-200 rounded-xl bg-white focus-within:border-[#0F4C81]/50 transition-colors overflow-hidden"
                  style={{ minHeight: '90px' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('laudo_profile_narrative_label')}</label>
                <RichTextField
                  value={profileForm.defaultNarrative || ''}
                  onChange={html => setProfileField('defaultNarrative', html)}
                  placeholder={t('laudo_profile_narrative_placeholder')}
                  className="border border-slate-200 rounded-xl bg-white focus-within:border-[#0F4C81]/50 transition-colors overflow-hidden"
                  style={{ minHeight: '150px' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{t('laudo_profile_logo_label')}</label>
                <div className="flex items-center gap-3">
                  <div className="w-28 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                    {profileForm.logo
                      ? <img src={profileForm.logo} alt="" className="max-h-full max-w-full object-contain" />
                      : <Building2 size={20} className="text-slate-300" />}
                  </div>
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    <Upload size={13} />
                    {t('laudo_profile_logo_change')}
                  </button>
                  {profileForm.logo && (
                    <button type="button" onClick={() => setProfileForm(f => ({ ...f, logo: null }))}
                      className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors">
                      {t('laudo_profile_logo_remove')}
                    </button>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleLogoFile(e.target.files?.[0])} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowProfileEditor(false)}
                  className="px-3 h-9 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                  {t('cancel')}
                </button>
                <button type="button" onClick={handleSaveProfile} disabled={savingProfile}
                  className="flex items-center gap-1.5 px-3 h-9 bg-[#0F4C81] hover:bg-[#0a3a63] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
                  <Check size={14} strokeWidth={2.5} />
                  {savingProfile ? t('loading') : t('laudo_profile_save_btn')}
                </button>
              </div>
            </div>
          )}

          {/* Hoja — mismo diseño que la plantilla de impresión real (neutra,
              sin membretes de color, como el PDF oficial). */}
          <div className="rounded-t-2xl shadow-premium-lg overflow-hidden mx-auto border border-slate-200 bg-white"
            style={{ maxWidth: '760px', color: '#1F2937', padding: '28px 32px 20px 32px' }}>
            <div className="flex items-center justify-center gap-1.5 mb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mr-1">{t('laudo_titulo_label')}:</span>
              {(['pericial', 'medico'] as const).map(opt => (
                <button key={opt} type="button" onClick={() => setTituloTipo(opt)}
                  className={cn(
                    'px-2.5 h-6 rounded-full text-[11px] font-semibold transition-colors',
                    tituloTipo === opt
                      ? 'bg-[#0F4C81] text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  )}
                >
                  {t(laudoTituloI18nKey(opt))}
                </button>
              ))}
            </div>
            <p className="text-center font-extrabold uppercase" style={{ fontSize: '17px', letterSpacing: '0.08em', color: '#111827', margin: 0, paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>
              {t(laudoTituloI18nKey(tituloTipo))}
            </p>

            {/* Paciente */}
            <div className="mt-4 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-4">
                <div style={{ position: 'relative' }}>
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                    {t('laudo_patient_label')} *
                  </label>
                  <div className="relative flex items-center">
                    <Search size={14} strokeWidth={1.75} className="absolute left-0 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={patientName}
                      onChange={e => { setPatientName(e.target.value); setShowPatDrop(true); }}
                      onFocus={() => { if (patientName.trim()) setShowPatDrop(true); }}
                      onBlur={() => setTimeout(() => setShowPatDrop(false), 150)}
                      placeholder={t('laudo_patient_placeholder')}
                      autoComplete="off"
                      className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors"
                      style={{ fontSize: '14px', color: '#1F2937', paddingBottom: '4px', paddingLeft: '20px' }}
                    />
                    {patientName && (
                      <button type="button"
                        onMouseDown={e => { e.preventDefault(); setPatientName(''); setShowPatDrop(false); }}
                        className="absolute right-0 text-slate-400 hover:text-slate-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  {showPatDrop && patientName.trim() && filteredPatients.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-premium-lg z-50 overflow-hidden">
                      {filteredPatients.map(p => (
                        <button key={p.id} type="button"
                          onMouseDown={e => {
                            e.preventDefault();
                            setPatientName(p.name);
                            setPatientIdentityCard(p.identityCard || '');
                            setShowPatDrop(false);
                          }}
                          className="flex items-center gap-2.5 text-left w-full px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                          <div className="w-7 h-7 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-[11px] font-bold shrink-0">
                            {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                          {p.identityCard && <p className="text-xs text-slate-400">{p.identityCard}</p>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                    {t('laudo_birth_label')}
                  </label>
                  <input
                    type="date"
                    value={patientBirthDate}
                    onChange={e => setPatientBirthDate(e.target.value)}
                    className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors"
                    style={{ fontSize: '14px', color: '#1F2937', paddingBottom: '4px' }}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                    {t('laudo_doc_label')}
                  </label>
                  <input
                    type="text"
                    value={patientIdentityCard}
                    onChange={e => setPatientIdentityCard(e.target.value)}
                    autoComplete="off"
                    className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors"
                    style={{ fontSize: '14px', color: '#1F2937', paddingBottom: '4px' }}
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                    {t('laudo_orgao_label')}
                  </label>
                  <input
                    type="text"
                    value={orgao}
                    onChange={e => setOrgao(e.target.value)}
                    placeholder={t('laudo_orgao_placeholder')}
                    autoComplete="off"
                    className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors"
                    style={{ fontSize: '14px', color: '#1F2937', paddingBottom: '4px' }}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                    {t('laudo_date_label')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors"
                    style={{ fontSize: '14px', color: '#1F2937', paddingBottom: '4px' }}
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                    {t('laudo_local_label')}
                  </label>
                  <input
                    type="text"
                    value={local}
                    onChange={e => setLocal(e.target.value)}
                    className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors"
                    style={{ fontSize: '14px', color: '#1F2937', paddingBottom: '4px' }}
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                    {t('patient_phone_label')} <span className="normal-case font-normal text-slate-400">({t('optional')})</span>
                  </label>
                  <div className="relative flex items-center">
                    <Phone size={13} strokeWidth={1.75} className="absolute left-0 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={e => setPatientPhone(e.target.value)}
                      className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors"
                      style={{ fontSize: '13px', color: '#1F2937', paddingBottom: '4px', paddingLeft: '18px' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Narrativa */}
            <div className="mt-4">
              <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                {t('laudo_narrative_label')} *
              </label>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setNarrativeModalOpen(true)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setNarrativeModalOpen(true); } }}
                className="w-full cursor-pointer border border-slate-200 rounded-xl bg-slate-50/50 hover:border-[#0F4C81] transition-colors"
                style={{ fontSize: '14px', lineHeight: 1.6, color: '#1F2937', padding: '10px 12px', minHeight: '150px' }}
              >
                {isRichTextEmpty(narrative)
                  ? <span className="text-slate-400">{t('laudo_narrative_placeholder')}</span>
                  : <RichText html={narrative} />}
              </div>
              <p className="mt-1 flex items-center gap-1" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                <Maximize2 size={10} />
                {t('laudo_narrative_expand_hint')}
              </p>
            </div>

            {/* Diagnóstico / CID (campo único) */}
            <div className="mt-4">
              <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                {t('laudo_cids_diagnostico_label')}
              </label>
              <input
                type="text"
                value={cids}
                onChange={e => setCids(e.target.value)}
                placeholder={t('laudo_cids_placeholder')}
                autoComplete="off"
                className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors"
                style={{ fontSize: '14px', color: '#1F2937', paddingBottom: '4px' }}
              />
            </div>

            {/* Conclusão + afastamento */}
            <div className="mt-4 rounded-xl border border-slate-200 p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280' }}>
                    {t('laudo_conclusao_label')}
                  </label>
                  {conclusaoOptions.length > 1 && (
                    <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{t('laudo_conclusao_manage_hint')}</span>
                  )}
                </div>
                <div className="space-y-1">
                  {conclusaoOptions.map(opt => (
                    <div key={opt.id} className="group flex items-start gap-2.5">
                      {editingConclusaoId === opt.id ? (
                        /* Edición del texto de la opción */
                        <div className="flex-1 flex items-center gap-2 py-0.5">
                          <Input
                            autoFocus
                            value={editingConclusaoLabel}
                            onChange={e => setEditingConclusaoLabel(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') { e.preventDefault(); void handleSaveConclusaoEdit(); }
                              if (e.key === 'Escape') setEditingConclusaoId(null);
                            }}
                            className="h-8 text-sm border-slate-200 bg-white"
                            style={{ fontSize: '13px' }}
                          />
                          <button
                            type="button"
                            onClick={() => void handleSaveConclusaoEdit()}
                            disabled={savingConclusao}
                            className="p-1.5 rounded-lg bg-[#0F4C81] text-white hover:bg-[#0a3a63] disabled:opacity-50 transition-colors shrink-0"
                            title={t('laudo_conclusao_edit_save')}
                          >
                            <Check size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingConclusaoId(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                            title={t('laudo_conclusao_edit_cancel')}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <label className="flex-1 flex items-start gap-2.5 cursor-pointer select-none py-0.5">
                            <input
                              type="radio"
                              name="laudo-conclusao"
                              checked={conclusao === opt.id}
                              onClick={() => { if (conclusao === opt.id) setConclusao(''); }}
                              onChange={() => setConclusao(opt.id)}
                              className="mt-0.5 accent-[#0F4C81]"
                            />
                            <span className="text-sm text-slate-700">{opt.label}</span>
                          </label>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditConclusao(opt)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-[#0F4C81] hover:bg-[#0F4C81]/5 transition-colors"
                              title={t('laudo_conclusao_edit')}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteConclusao(opt)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title={t('laudo_conclusao_delete')}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Alta de una conclusión nueva al catálogo */}
                <div className="flex gap-2 mt-2">
                  <Input
                    className="h-8 text-sm border-slate-200 bg-slate-50/50 focus:bg-white"
                    style={{ fontSize: '13px' }}
                    placeholder={t('laudo_conclusao_add_placeholder')}
                    value={newConclusaoLabel}
                    onChange={e => setNewConclusaoLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleCreateConclusao(); } }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateConclusao()}
                    disabled={savingConclusao || !newConclusaoLabel.trim()}
                    className="flex items-center gap-1.5 px-2.5 rounded-lg bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-xs font-bold disabled:opacity-40 transition-colors shrink-0"
                  >
                    <PlusCircle size={13} /> {t('laudo_conclusao_add_btn')}
                  </button>
                </div>

                <p className="mt-2" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {t('laudo_conclusao_clear_hint')}
                </p>
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                    {t('laudo_afastamento_label')}
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-semibold">{t('laudo_afastamento_de')}</span>
                    <input
                      type="number"
                      min={0}
                      value={afastamentoDias}
                      onChange={e => setAfastamentoDias(e.target.value)}
                      className="w-24 outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors text-center"
                      style={{ fontSize: '14px', color: '#1F2937', paddingBottom: '4px' }}
                    />
                    <span className="text-xs font-bold text-slate-500">{t('laudo_dias')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="mt-4">
              <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                {t('laudo_observacoes_label')}
              </label>
              <ExpandableRichField
                value={observacoes}
                onChange={setObservacoes}
                placeholder={t('laudo_observacoes_placeholder')}
                modalTitle={t('laudo_observacoes_label')}
                className="rounded-xl border border-slate-200 bg-slate-50/50 hover:border-[#0F4C81] transition-colors"
                style={{ fontSize: '14px', lineHeight: 1.6, color: '#1F2937', padding: '10px 12px', minHeight: '80px' }}
              />
            </div>

            {/* Firma / emisor de la clínica — preview de lo que se imprime.
                Doctor/CRM: perfil propio si existe, si no el default (Campinas).
                Nombre/dirección/teléfono: SIEMPRE de esta clínica. */}
            {((laudoProfile ?? profileDisplay)?.doctorName || laudoProfile?.clinicNameFiscal || recetaProfile?.name) && (
              <div className="mt-6 text-center">
                <p style={{ margin: '0 0 6px 0' }} className="text-slate-400 select-none">______________________________________</p>
                {(laudoProfile ?? profileDisplay)?.doctorName && (
                  <p style={{ margin: '0 0 2px 0', fontSize: '12.5px', color: '#111827', fontWeight: 700 }}>{(laudoProfile ?? profileDisplay)?.doctorName}</p>
                )}
                {(laudoProfile ?? profileDisplay)?.doctorCrm && (
                  <p style={{ margin: '0 0 2px 0', fontSize: '11.5px', color: '#111827' }}>{(laudoProfile ?? profileDisplay)?.doctorCrm}</p>
                )}
                {(laudoProfile?.clinicNameFiscal || recetaProfile?.name) && (
                  <p style={{ margin: '0 0 2px 0', fontSize: '11.5px', color: '#111827', fontWeight: 700 }}>
                    {laudoProfile?.clinicNameFiscal || recetaProfile?.name}
                  </p>
                )}
                {(laudoProfile?.clinicAddress || recetaProfile?.address) && (
                  <p style={{ margin: '0 0 2px 0', fontSize: '10.5px', color: '#6B7280' }}>
                    {laudoProfile?.clinicAddress || recetaProfile?.address}
                  </p>
                )}
                {(laudoProfile?.clinicPhone || recetaProfile?.phone) && (
                  <p style={{ margin: 0, fontSize: '10.5px', color: '#6B7280' }}>
                    {laudoProfile?.clinicPhone || recetaProfile?.phone}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={handleSaveOnly} disabled={saving}
              className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all disabled:opacity-50">
              <Check size={16} className={saving ? 'animate-pulse' : ''} />
              {t('laudo_save_btn')}
            </button>
            <button type="button" onClick={handlePrint} disabled={printing}
              className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all disabled:opacity-50">
              <Printer size={16} className={printing ? 'animate-pulse' : ''} />
              {t('laudo_print_btn')}
            </button>
            <button type="button" onClick={handleSignPrint} disabled={signing}
              className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50">
              <FileSignature size={16} className={signing ? 'animate-pulse' : ''} />
              {signing ? t('sign_print_loading') : t('save_sign_print')}
            </button>
          </div>
        </div>
      )}

      {/* ── Narrativa expandida (modal) — misma edición, vista grande ── */}
      {narrativeModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm animate-fade-in"
            onClick={() => setNarrativeModalOpen(false)}
          />
          {/* El modal se acota a 90vh (columna flex) y el área editable hace
              scroll POR DENTRO (max-height + overflow-y:auto): sin esto, una
              narrativa larga hacía crecer el modal más allá de la ventana y,
              como el overlay es items-center y el body va con overflow:hidden,
              el texto sobrante quedaba fuera de alcance — no había forma de
              verlo ni desplazarse a él. */}
          <div
            ref={narrativeModalRef}
            className="relative w-full max-w-3xl z-10 bg-white rounded-2xl shadow-premium-lg border border-slate-200/60 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
          >

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0F4C81]/8 border border-[#0F4C81]/15">
                  <Maximize2 size={16} className="text-[#0F4C81]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t('laudo_narrative_label')}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t('laudo_narrative_modal_subtitle')}</p>
                </div>
              </div>
              <button
                onClick={() => setNarrativeModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 flex-1 min-h-0 overflow-y-auto">
              <RichTextField
                value={narrative}
                onChange={setNarrative}
                placeholder={t('laudo_narrative_placeholder')}
                autoFocus
                className="border border-slate-200 rounded-xl bg-slate-50/50 focus-within:border-[#0F4C81] focus-within:bg-white transition-colors overflow-hidden"
                style={{
                  fontSize: '15px',
                  lineHeight: 1.7,
                  color: '#1F2937',
                  padding: '14px 16px',
                  minHeight: '55vh',
                  maxHeight: 'calc(90vh - 170px)',
                  overflowY: 'auto',
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { Receituario as ReceituarioDoc } from '../types';
import { ArrowLeft, Printer, FileSignature, Building2, RefreshCw, Search, X, Phone } from 'lucide-react';
import { ClinicProfileField } from '../components/ClinicProfileField';
import { RichTextField } from '../components/ui/rich-text-field';
import { findClinicProfile, normalizeClinicKey } from '../lib/clinic';
import { getErrorMessage } from '../lib/utils';
import { isRichTextEmpty } from '../lib/richText';
import cerebroLogo from '../assets/cerebro.png';

const DARK = '#0A3A63';
const PRIMARY = '#0F4C81';
const LIGHT = '#6BB3EC';

// Fecha local (no UTC) — toISOString() usa UTC y puede mostrar el día
// anterior/siguiente cerca de la medianoche según el huso horario.
const todayLocalStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const Receituario: React.FC = () => {
  const { t } = useTranslation();
  const {
    setCurrentView, clinicProfiles, setLastClinicName, lastClinicName, patients,
    triggerDirectPrintReceituario, triggerSignAndPrint, addReceituario,
    activeReceituarioForEdit, setActiveReceituarioForEdit, updateReceituario,
  } = useApp();

  const isEdit = !!activeReceituarioForEdit;

  const [clinicName, setClinicName] = useState(lastClinicName); // global shared
  const [content, setContent] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [showPatDrop, setShowPatDrop] = useState(false);
  const [date, setDate] = useState(() => todayLocalStr());
  const [printing, setPrinting] = useState(false);
  const [signing, setSigning] = useState(false);

  // Precarga los campos al editar un receituário existente (viene de
  // ReceituariosList.tsx) — salta directo al paso 2 porque clinicName ya
  // queda seteado acá.
  useEffect(() => {
    if (!activeReceituarioForEdit) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the whole form from the edit target
    setClinicName(activeReceituarioForEdit.clinicName || '');
    setContent(activeReceituarioForEdit.content || '');
    setPatientName(activeReceituarioForEdit.patientName || '');
    setPatientPhone(activeReceituarioForEdit.patientPhone || '');
    setDate(activeReceituarioForEdit.date || todayLocalStr());
  }, [activeReceituarioForEdit]);

  const profile = useMemo(() => findClinicProfile(clinicProfiles, clinicName), [clinicProfiles, clinicName]);

  // Sugerencias de pacientes ya registrados en la base — el receituário no
  // vincula un patientId real (sigue siendo texto libre, sin ficha ni
  // historial), pero buscar contra los pacientes existentes evita errores
  // de tipeo y reutiliza nombres ya cargados.
  const filteredPatients = useMemo(() => {
    if (!patientName.trim()) return [];
    const q = normalizeClinicKey(patientName);
    return patients.filter(p => normalizeClinicKey(p.name).includes(q)).slice(0, 8);
  }, [patients, patientName]);

  const clinicData = {
    clinicName: clinicName.trim() || undefined,
    clinicSecretaria: profile?.secretaria || undefined,
    clinicSistema: profile?.sistema || undefined,
    clinicAddress: profile?.address || undefined,
    clinicPhone: profile?.phone || undefined,
    clinicCnpj: profile?.cnpj || undefined,
  };

  const patientData = {
    patientName: patientName.trim() || undefined,
    patientPhone: patientPhone.trim() || undefined,
    date: date || undefined,
  };

  const handleSelectClinic = (name: string) => {
    setClinicName(name);
    setLastClinicName(name); // global shared
  };

  const handleChangeClinic = () => {
    setClinicName('');
    setLastClinicName('');

    setContent('');
    setPatientName('');
    setPatientPhone('');
    setShowPatDrop(false);
    setDate(todayLocalStr());
    setActiveReceituarioForEdit(null);
  };

  // "Imprimir" persiste el receituário (crea uno nuevo, o actualiza el que
  // se esté editando) y lo imprime en un solo paso — sin firma digital.
  const handlePrint = async () => {
    if (isRichTextEmpty(content)) { alert(t('receituario_content_required')); return; }
    setPrinting(true);
    try {
      if (isEdit && activeReceituarioForEdit) {
        const updated: ReceituarioDoc = { ...activeReceituarioForEdit, content, ...clinicData, ...patientData };
        await updateReceituario(updated);
        triggerDirectPrintReceituario(updated);
        setActiveReceituarioForEdit(null);
      } else {
        const saved = await addReceituario({ content, ...clinicData, ...patientData });
        triggerDirectPrintReceituario({ ...saved, ...patientData });
      }
    } catch (e) {
      alert(t('save_error_msg', { message: getErrorMessage(e) }));
    } finally {
      setPrinting(false);
    }
  };

  const handleSignPrint = async () => {
    if (isRichTextEmpty(content)) { alert(t('receituario_content_required')); return; }
    setSigning(true);
    try {
      let record: ReceituarioDoc;
      if (isEdit && activeReceituarioForEdit) {
        record = { ...activeReceituarioForEdit, content, ...clinicData, ...patientData };
        await updateReceituario(record);
      } else {
        const saved = await addReceituario({ content, ...clinicData, ...patientData });
        // El nombre/fecha que se imprimen y firman son SIEMPRE los que el Dr.
        // tiene tipeados en pantalla — no lo que devuelva el servidor. Si el
        // backend por lo que sea no los persiste/devuelve, la impresión
        // firmada no debe salir con el nombre del paciente en blanco.
        record = { ...saved, ...patientData };
      }
      await triggerSignAndPrint('receituario', record);
      setActiveReceituarioForEdit(null);
    } catch (e) {
      alert(t('sign_pdf_error', { message: getErrorMessage(e) }));
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setActiveReceituarioForEdit(null); setCurrentView('receituarios'); }}
          className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('nav_receituario')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('receituario_desc')}</p>
        </div>
      </div>

      {!clinicName ? (
        /* ── Paso 1: elegir clínica ────────────────────────────────────── */
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-premium p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-[#0F4C81]/8 border border-[#0F4C81]/15 flex items-center justify-center mx-auto">
            <Building2 size={22} className="text-[#0F4C81]" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{t('receituario_select_clinic_title')}</h2>
            <p className="text-sm text-slate-500 mt-1">{t('receituario_select_clinic_desc')}</p>
          </div>
          <div className="text-left">
            <ClinicProfileField
              options={clinicProfiles}
              value={clinicName}
              onValueChange={handleSelectClinic}
            />
          </div>
        </div>
      ) : (
        /* ── Paso 2: hoja + texto libre ────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Building2 size={15} className="text-[#0F4C81]" />
              {clinicName}
            </div>
            <button type="button" onClick={handleChangeClinic}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0F4C81] transition-colors">
              <RefreshCw size={13} />
              {t('receituario_change_clinic_btn')}
            </button>
          </div>

          {/* Hoja — mismo diseño que la plantilla de impresión real: blanca,
              solo la onda del pie lleva el degradado azul. Redondeo SOLO
              arriba (rounded-t-2xl, no rounded-2xl): con las 4 esquinas
              redondeadas, el overflow-hidden le recortaba un triángulo curvo
              a la onda justo en las esquinas inferiores, dando la falsa
              sensación de que no llegaba al ancho completo de la hoja. */}
          <div className="rounded-t-2xl shadow-premium-lg overflow-hidden mx-auto border border-slate-200" style={{ maxWidth: '760px' }}>
            <div style={{
              backgroundColor: '#fff',
              color: '#1F2937',
              padding: '28px 32px 0 32px',
              minHeight: '520px',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div className="flex items-center gap-2.5">
                <img src={cerebroLogo} alt="" style={{ width: '26px', height: '26px', objectFit: 'contain', flexShrink: 0 }} />
                <span className="font-extrabold" style={{ fontSize: '17px', lineHeight: 1.3, color: DARK }}>
                  {clinicName}
                </span>
              </div>
              <div style={{ height: '3px', backgroundColor: PRIMARY, marginTop: '10px', marginBottom: '20px', borderRadius: '1px' }} />

              {/* Los datos de la clínica van DENTRO de este recuadro, ancorados
                  abajo a la derecha (no como fila aparte debajo) — cuando se
                  firme, ese mismo rincón lo ocupa el texto legal real que
                  agrega el servidor (ver PrintReceituarioTemplate.tsx). */}
              <div className="flex-1 mb-8 rounded-xl border border-slate-200 flex flex-col relative overflow-hidden" style={{ padding: '20px 22px 16px 22px', minHeight: '260px' }}>
                <img src={cerebroLogo} alt="" className="pointer-events-none" style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)', width: '210px', height: '210px',
                  objectFit: 'contain', opacity: 0.07,
                }} />

                {/* Título decorado — dentro del recuadro de escritura, con
                    líneas divisorias a los lados (equivalente prolijo del
                    "-----TÍTULO-----" pedido). */}
                <div className="flex items-center gap-3 relative" style={{ marginBottom: '18px' }}>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#CBD5E1' }} />
                  <span className="font-extrabold text-center" style={{ fontSize: '16px', letterSpacing: '0.05em', whiteSpace: 'pre', color: PRIMARY }}>
                    {t('print_receituario_title')}
                  </span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#CBD5E1' }} />
                </div>

                {/* Paciente (izq., con búsqueda contra la base de pacientes) +
                    Data da Consulta (der.) — debajo del título. */}
                <div className="flex items-start justify-between gap-4 relative" style={{ marginBottom: '18px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                      {t('receituario_patient_name_label')}
                    </label>
                    <div className="relative flex items-center">
                      <Search size={14} strokeWidth={1.75} className="absolute left-0 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={patientName}
                        onChange={e => { setPatientName(e.target.value); setShowPatDrop(true); }}
                        onFocus={() => { if (patientName.trim()) setShowPatDrop(true); }}
                        onBlur={() => setTimeout(() => setShowPatDrop(false), 150)}
                        placeholder={t('receituario_patient_name_placeholder')}
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
                            onMouseDown={e => { e.preventDefault(); setPatientName(p.name); setShowPatDrop(false); }}
                            className="flex items-center gap-2.5 text-left w-full px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                            <div className="w-7 h-7 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-[11px] font-bold shrink-0">
                              {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ minWidth: '160px' }}>
                    <label className="block font-bold uppercase text-right" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                      {t('receituario_consult_date_label')}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors text-right"
                      style={{ fontSize: '14px', color: '#1F2937', paddingBottom: '4px' }}
                    />
                  </div>
                </div>

                {/* Celular/WhatsApp del paciente — opcional, NO se imprime
                    (ver PrintReceituarioTemplate.tsx): solo se guarda para
                    poder usar el botón de WhatsApp en ReceituariosList.tsx. */}
                <div style={{ maxWidth: '320px', marginBottom: '18px' }}>
                  <label className="block font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '0.04em', color: '#6B7280', marginBottom: '4px' }}>
                    {t('patient_phone_label')} <span className="normal-case font-normal text-slate-400">({t('optional')})</span>
                  </label>
                  <div className="relative flex items-center">
                    <Phone size={13} strokeWidth={1.75} className="absolute left-0 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={e => setPatientPhone(e.target.value)}
                      placeholder={t('patient_phone_placeholder')}
                      className="w-full outline-none border-0 border-b border-slate-300 bg-transparent focus:border-[#0F4C81] transition-colors"
                      style={{ fontSize: '13px', color: '#1F2937', paddingBottom: '4px', paddingLeft: '18px' }}
                    />
                  </div>
                  <p className="text-slate-400" style={{ fontSize: '10px', marginTop: '3px' }}>{t('receituario_phone_hint')}</p>
                </div>

                <RichTextField
                  value={content}
                  onChange={setContent}
                  placeholder={t('receituario_content_placeholder')}
                  className="flex-1 border-0 bg-transparent"
                  style={{ fontSize: '15px', lineHeight: 1.7, minHeight: '220px', padding: 0 }}
                />
                {(profile?.secretaria || profile?.sistema || profile?.address || profile?.phone || profile?.cnpj) && (
                  <div className="flex justify-end" style={{ marginTop: '14px' }}>
                    <div className="text-right" style={{ maxWidth: '62%' }}>
                      {profile?.secretaria && <p className="font-bold" style={{ margin: '0 0 2px 0', fontSize: '10px', color: '#1F2937' }}>{profile.secretaria}</p>}
                      {profile?.sistema && <p className="font-bold" style={{ margin: '0 0 4px 0', fontSize: '10px', color: '#1F2937' }}>{profile.sistema}</p>}
                      {profile?.address && <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#6B7280', whiteSpace: 'pre-line' }}>{profile.address}</p>}
                      {profile?.phone && <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: '#6B7280' }}><strong>{t('receta_clinic_phone_label')}:</strong> {profile.phone}</p>}
                      {profile?.cnpj && <p style={{ margin: 0, fontSize: '9px', color: '#6B7280' }}><strong>CNPJ:</strong> {profile.cnpj}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ margin: '0 -32px' }}>
                <svg viewBox="0 0 500 44" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '64px' }}>
                  <defs>
                    <linearGradient id="onda-receituario-preview" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={LIGHT} />
                      <stop offset="55%" stopColor={PRIMARY} />
                      <stop offset="100%" stopColor={DARK} />
                    </linearGradient>
                  </defs>
                  <path d="M0,14 C70,36 170,4 270,18 C360,30 430,6 500,16 L500,44 L0,44 Z" fill="url(#onda-receituario-preview)" />
                </svg>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-center gap-3">
            <button type="button" onClick={handlePrint} disabled={printing}
              className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all disabled:opacity-50">
              <Printer size={16} className={printing ? 'animate-pulse' : ''} />
              {t('receituario_print_btn')}
            </button>
            <button type="button" onClick={handleSignPrint} disabled={signing}
              className="flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50">
              <FileSignature size={16} className={signing ? 'animate-pulse' : ''} />
              {signing ? t('sign_print_loading') : t('save_sign_print')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

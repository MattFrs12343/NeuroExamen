import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import {
  User, Search, Calendar, Check, ArrowLeft, X,
  PlusCircle, ClipboardList, CheckCircle2,
  Stethoscope, FileText, Send,
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ClinicField } from '../components/ClinicField';
import { cn } from '../lib/utils';

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

export const NewEncaminhamento: React.FC = () => {
  const { t } = useTranslation();
  const {
    patients, addPatient,
    setCurrentView, activeEncaminhamentoForEdit, setActiveEncaminhamentoForEdit,
    triggerDirectPrintEncaminhamento, addEncaminhamento, updateEncaminhamento,
    specialistsCatalog, addSpecialist,
    lastClinicName, setLastClinicName,
  } = useApp();

  const isEdit = !!activeEncaminhamentoForEdit;

  const [patientId,   setPatientId]   = useState('');
  const [patQuery,    setPatQuery]    = useState('');
  const [showPatDrop, setShowPatDrop] = useState(false);
  const [encDate,     setEncDate]     = useState('');
  const [noDate,      setNoDate]      = useState(false);
  const [patientAge,  setPatientAge]  = useState('');
  const [hd,          setHd]          = useState('');
  const [motivo,      setMotivo]      = useState('');
  const [clinicName,  setClinicName]  = useState(lastClinicName);
  const [selectedSpecialists, setSelectedSpecialists] = useState<string[]>([]);
  const [newSpecialistName,   setNewSpecialistName]   = useState('');

  const filteredPatients = useMemo(() => {
    if (!patQuery.trim()) return [];
    const q = patQuery.toLowerCase();
    return patients.filter(p => p.name.toLowerCase().includes(q) || p.identityCard.includes(q));
  }, [patients, patQuery]);

  // Prefill en modo edición
  useEffect(() => {
    if (activeEncaminhamentoForEdit) {
      setPatientId(activeEncaminhamentoForEdit.patientId);
      const p = patients.find(p => p.id === activeEncaminhamentoForEdit.patientId);
      if (p) setPatQuery(p.name);
      setEncDate(activeEncaminhamentoForEdit.date || '');
      setNoDate(!activeEncaminhamentoForEdit.date);
      setPatientAge(activeEncaminhamentoForEdit.patientAge || '');
      setHd(activeEncaminhamentoForEdit.hd || '');
      setMotivo(activeEncaminhamentoForEdit.motivo || '');
      setClinicName(activeEncaminhamentoForEdit.clinicName || '');
      setSelectedSpecialists(activeEncaminhamentoForEdit.specialists || []);
    } else {
      const now = new Date();
      setEncDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setNoDate(false);
      setPatientAge('');
      setHd('');
      setMotivo('');
      setClinicName(lastClinicName);
      setSelectedSpecialists([]);
    }
  }, [activeEncaminhamentoForEdit, patients, lastClinicName]);

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
  };

  const toggleSpecialist = (id: string) =>
    setSelectedSpecialists(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreateSpecialist = async () => {
    const name = newSpecialistName.trim(); if (!name) return;
    try {
      const created = await addSpecialist(name);
      setSelectedSpecialists(prev => [...prev, created.id]);
      setNewSpecialistName('');
    } catch (e: any) { alert(t('save_error_msg', { message: e.message })); }
  };

  const handleSave = async (print: boolean) => {
    if (!patQuery.trim())            { alert(t('new_order_validation_pat'));         return; }
    if (!selectedSpecialists.length) { alert(t('encaminhamento_validation_specs'));   return; }

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

    const payload = {
      patientId: fPid, date: noDate ? undefined : (encDate.trim() || undefined),
      patientAge: patientAge.trim() || undefined,
      hd: hd.trim() || undefined,
      motivo: motivo.trim() || undefined,
      clinicName: clinicName.trim() || undefined,
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
      if (print) triggerDirectPrintEncaminhamento(saved);
      else alert(isEdit ? t('encaminhamento_success_edit') : t('encaminhamento_success'));
      setCurrentView('encaminhamentos');
    } catch (e: any) { alert(t('save_error_msg', { message: e.message })); }
  };

  const handleCancel = () => { if (isEdit) setActiveEncaminhamentoForEdit(null); setCurrentView('encaminhamentos'); };

  const handleClear = () => {
    setPatientId(''); setPatQuery('');
    setNoDate(false);
    setPatientAge(''); setHd(''); setMotivo(''); setClinicName('');
    setSelectedSpecialists([]);
  };

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
            {isEdit ? t('new_encaminhamento_edit_title') : t('new_encaminhamento_title')}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna izquierda (2/3) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* ── Bloque 1: Especialistas ──────────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Stethoscope} title={t('encaminhamento_sec_specialists')} />
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {specialistsCatalog.map(s => {
                  const checked = selectedSpecialists.includes(s.id);
                  return (
                    <label key={s.id} className={cn(
                      'flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all select-none',
                      checked
                        ? 'bg-[#0F4C81]/8 border-[#0F4C81]/30 text-[#0F4C81]'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    )}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSpecialist(s.id)}
                        className="w-4 h-4 rounded cursor-pointer accent-[#0F4C81]"
                      />
                      <span className="leading-snug">{s.name}</span>
                    </label>
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
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-xs font-bold rounded-xl transition-colors shrink-0">
                  <PlusCircle size={13} /> {t('encaminhamento_specialist_add_btn')}
                </button>
              </div>
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
                          onMouseDown={e => { e.preventDefault(); handleSelectPatient(p.id, p.name); }}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {t('encaminhamento_age_label')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    placeholder={t('encaminhamento_age_placeholder')}
                    value={patientAge} onChange={e => setPatientAge(e.target.value)} />
                </div>
              </div>

              {/* Clínica / Institución */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Clínica / Institución <span className="text-slate-400 font-normal">({t('optional')})</span>
                </label>
                <ClinicField value={clinicName} onValueChange={v => { setClinicName(v); setLastClinicName(v); }} />
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
                      className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      value={encDate} onChange={e => setEncDate(e.target.value)} />
                  </div>
                  <label className="flex items-center gap-2.5 mt-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={noDate}
                      onChange={e => handleToggleNoDate(e.target.checked)}
                      className="w-5 h-5 rounded cursor-pointer accent-[#0F4C81]" />
                    <span className="text-sm font-semibold text-slate-700">{t('receta_no_date_checkbox')}</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2">
                    <FileText size={12} /> {t('encaminhamento_hd_label')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </label>
                  <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    placeholder={t('encaminhamento_hd_placeholder')}
                    value={hd} onChange={e => setHd(e.target.value)} />
                </div>
              </div>
            </div>
          </PanelCard>

          {/* ── Bloque 3: Encaminhamento ─────────────────────────────────── */}
          <PanelCard>
            <PanelCardHead icon={Send} title={t('encaminhamento_sec_motivo')} iconBg="bg-emerald-50 border-emerald-200" iconCls="text-emerald-600" />
            <div className="p-6 space-y-2">
              <p className="text-xs text-slate-500 italic">{t('encaminhamento_fixed_text')}</p>
              <Textarea
                rows={6}
                className="border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 resize-none"
                placeholder={t('encaminhamento_motivo_placeholder')}
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
              />
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
                      {patientId && selectedPatient && (
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
                    <span className="text-[10px] font-bold text-white bg-[#0F4C81] px-2 py-0.5 rounded-full">{selectedSpecialists.length}</span>
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
                          <div className="w-1.5 h-1.5 rounded-full bg-[#0F4C81] mt-1.5 shrink-0" />
                          <p className="text-xs text-slate-700 leading-snug flex-1">{spec?.name ?? sid}</p>
                          <button type="button" onClick={() => toggleSpecialist(sid)}
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

          <div className="space-y-2">
            <button type="button" onClick={() => handleSave(false)}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-sm font-bold shadow-sm hover:shadow-md transition-all">
              <Check size={17} strokeWidth={2.5} />
              {t('save')}
            </button>
            <button type="button" onClick={() => handleSave(true)}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-sm font-semibold transition-all">
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

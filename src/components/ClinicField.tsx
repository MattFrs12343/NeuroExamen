import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { Building2, Plus, X, Check } from 'lucide-react';
import { Input } from './ui/input';
import { getErrorMessage } from '../lib/utils';

interface ClinicFieldProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const ClinicField: React.FC<ClinicFieldProps> = ({ value, onValueChange }) => {
  const { t } = useTranslation();
  const { clinics, addClinic } = useApp();

  const [showDrop, setShowDrop] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter(c => c.toLowerCase().includes(q));
  }, [value, clinics]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const added = await addClinic(name);
      onValueChange(added);
      setNewName('');
      setShowAdd(false);
      setShowDrop(false);
    } catch (err) {
      alert(t('save_error_msg', { message: getErrorMessage(err) }));
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1" ref={ref}>
          <Building2 size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
          <Input className="pl-10 pr-8 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
            placeholder="Ej: Clínica Neurológica del Sur"
            value={value}
            onChange={e => { onValueChange(e.target.value); setShowDrop(true); }}
            onFocus={() => setShowDrop(true)}
            autoComplete="off" />
          {value && (
            <button type="button"
              onClick={() => { onValueChange(''); setShowDrop(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
          {showDrop && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-premium-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">
                <span>{t('clinic_list_label')} — {suggestions.length}</span>
                <button type="button" onClick={() => setShowDrop(false)} className="hover:text-slate-600"><X size={11} /></button>
              </div>
              <ul className="max-h-52 overflow-y-auto py-1">
                {suggestions.map(c => (
                  <li key={c}>
                    <button type="button"
                      onMouseDown={() => { onValueChange(c); setShowDrop(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                      <Building2 size={14} strokeWidth={1.75} className="text-[#0F4C81] shrink-0" />
                      <span className="text-xs text-slate-600 leading-snug">{c}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button type="button"
          onClick={() => { setShowAdd(v => !v); setShowDrop(false); }}
          title={t('clinic_add_tooltip')}
          className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#0F4C81]/40 text-[#0F4C81] text-xs font-bold transition-all shrink-0">
          <Plus size={15} strokeWidth={2.5} />
          {t('clinic_add_btn')}
        </button>
      </div>

      {showAdd && (
        <div className="mt-2 flex gap-2 animate-fade-in">
          <Input className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
            placeholder={t('clinic_add_placeholder')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            autoComplete="off" />
          <button type="button" onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 h-11 bg-[#0F4C81] hover:bg-[#0a3a63] text-white text-xs font-bold rounded-xl transition-colors shrink-0">
            <Check size={14} strokeWidth={2.5} />
            {t('clinic_add_confirm_btn')}
          </button>
        </div>
      )}
    </>
  );
};
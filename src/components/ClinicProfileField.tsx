import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { ClinicProfile } from '../types';
import { Building2, Plus, Check, X } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { getErrorMessage } from '../lib/utils';

interface ClinicProfileFieldProps {
  options: ClinicProfile[];
  value: string;
  onValueChange: (value: string) => void;
}

const emptyForm = () => ({ name: '', data: '' });

export const ClinicProfileField: React.FC<ClinicProfileFieldProps> = ({ options, value, onValueChange }) => {
  const { t } = useTranslation();
  const { addRecetaClinic } = useApp();

  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const setField = (key: keyof ReturnType<typeof emptyForm>, val: string) => setForm(f => ({ ...f, [key]: val }));

  const fieldCls = 'h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50';

  const handleAdd = async () => {
    const name = form.name.trim().toLocaleUpperCase();
    if (!name) { alert(t('clinic_profile_name_required')); return; }
    setSaving(true);
    try {
      const added = await addRecetaClinic({
        name,
        address: form.data.trim() || undefined,
      });
      onValueChange(added);
      setShowAdd(false);
      setForm(emptyForm());
    } catch (err) {
      alert(t('save_error_msg', { message: getErrorMessage(err) }));
    } finally {
      setSaving(false);
    }
  };

  const closeAdd = () => { setShowAdd(false); setForm(emptyForm()); };

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Building2 size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
          <select
            value={value}
            onChange={e => onValueChange(e.target.value)}
            className="flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F4C81]/20 focus:border-[#0F4C81]/50 focus:bg-white cursor-pointer transition-all"
          >
            <option value="">{t('receta_clinic_select_placeholder')}</option>
            {options.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <button type="button"
          onClick={() => setShowAdd(v => !v)}
          title={t('clinic_add_tooltip')}
          className="flex items-center justify-center gap-1.5 px-3 h-11 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-[#0F4C81]/40 text-[#0F4C81] text-xs font-bold transition-all shrink-0">
          <Plus size={15} strokeWidth={2.5} />
          {t('clinic_add_btn')}
        </button>
      </div>

      {showAdd && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-900">{t('clinic_profile_new_title')}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{t('clinic_profile_new_subtitle')}</p>
            </div>
            <button type="button" onClick={closeAdd} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X size={14} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('clinic_profile_name_label')} <span className="text-slate-400 font-normal">*</span>
            </label>
            <Input className={fieldCls} placeholder={t('clinic_add_placeholder')}
              value={form.name} onChange={e => setField('name', e.target.value.toLocaleUpperCase())}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              autoComplete="off" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('clinic_profile_data_label')} <span className="text-slate-400 font-normal">({t('optional')})</span>
            </label>
            <Textarea
              rows={4}
              className="border-slate-200 bg-white focus:border-[#0F4C81]/50 resize-y"
              placeholder={t('clinic_profile_data_placeholder')}
              value={form.data}
              onChange={e => setField('data', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeAdd}
              className="px-3 h-9 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-white transition-colors">
              {t('cancel')}
            </button>
            <button type="button" onClick={handleAdd} disabled={saving}
              className="flex items-center gap-1.5 px-3 h-9 bg-[#0F4C81] hover:bg-[#0a3a63] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors">
              <Check size={14} strokeWidth={2.5} />
              {saving ? t('loading') : t('clinic_add_confirm_btn')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
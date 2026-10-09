import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { ClinicProfile } from '../types';
import { Building2, Plus, Check, X, ChevronDown } from 'lucide-react';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { getErrorMessage, cn } from '../lib/utils';

interface ClinicProfileFieldProps {
  options: ClinicProfile[];
  value: string;
  onValueChange: (value: string) => void;
}

const emptyForm = () => ({ name: '', data: '' });

export const ClinicProfileField: React.FC<ClinicProfileFieldProps> = ({ options, value, onValueChange }) => {
  const { t } = useTranslation();
  const { addRecetaClinic } = useApp();

  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeIdx, setActiveIdx] = useState(-1);

  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items = [{ name: '', label: t('receta_clinic_select_placeholder') }, ...options.map(o => ({ name: o.name, label: o.name }))];
  const selectedIdx = items.findIndex(i => i.name === value);

  const setField = (key: keyof ReturnType<typeof emptyForm>, val: string) => setForm(f => ({ ...f, [key]: val }));

  const fieldCls = 'h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50';

  // Cierra el desplegable al hacer click afuera.
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  // Al abrir, deja el valor actual a la vista. El índice teclado se arma en el
  // handler del botón (no acá) para no setear state dentro del efecto.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const openList = () => { setActiveIdx(selectedIdx); setOpen(true); };
  const toggleList = () => (open ? setOpen(false) : openList());

  const pick = (name: string) => { onValueChange(name); setOpen(false); };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'Tab') { setOpen(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const next = Math.min(items.length - 1, Math.max(0, (activeIdx < 0 ? selectedIdx : activeIdx) + dir));
      setActiveIdx(next);
      (listRef.current?.children[next] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIdx >= 0) pick(items[activeIdx].name);
    }
  };


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
        {/* Desplegable propio (no <select> nativo): el navegador voltea la
            lista hacia ARRIBA cuando las 17 clínicas no caben debajo del
            cursor, y en el paso 1 de Laudo quedaba tapaando el formulario.
            Acá la lista siempre se dibuja HACIA ABAJO, con scroll interno. */}
        <div className="relative flex-1" ref={wrapRef}>
          <Building2 size={16} strokeWidth={1.75} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" />
          <button
            type="button"
            onClick={toggleList}
            onKeyDown={e => { if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openList(); } }}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={cn(
              'flex h-11 w-full items-center rounded-xl border pl-10 pr-9 text-left text-sm transition-all cursor-pointer',
              open
                ? 'bg-white border-[#0F4C81]/50 ring-2 ring-[#0F4C81]/20'
                : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-[#0F4C81]/40'
            )}
          >
            <span className={cn('truncate', value ? 'text-slate-800' : 'text-slate-400')}>
              {value || t('receta_clinic_select_placeholder')}
            </span>
            <ChevronDown size={16} strokeWidth={2}
              className={cn('absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-transform no-print', open && 'rotate-180')} />
          </button>

          {open && (
            <ul
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              onKeyDown={onListKeyDown}
              className="absolute left-0 right-0 top-full mt-1 z-50 max-h-72 overflow-y-auto overscroll-contain py-1 bg-white border border-slate-200 rounded-xl shadow-premium-lg animate-fade-in focus:outline-none"
            >
              {items.map((it, i) => {
                const isSel = it.name === value;
                return (
                  <li key={it.name || '__placeholder'}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => pick(it.name)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors',
                        i === activeIdx ? 'bg-slate-50' : 'bg-transparent',
                        it.name ? 'text-slate-700 text-sm' : 'text-slate-400 text-sm italic'
                      )}
                    >
                      <Building2 size={14} strokeWidth={1.75} className={cn('shrink-0', it.name ? 'text-[#0F4C81]/50' : 'text-slate-300')} />
                      <span className="truncate flex-1">{it.label}</span>
                      {isSel && <Check size={14} strokeWidth={2.5} className="shrink-0 text-[#0F4C81]" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { PlusCircle, Search, X, User, Users, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export const Patients: React.FC = () => {
  const { t } = useTranslation();
  const { patients, addPatient } = useApp();

  const [query,      setQuery]     = useState('');
  const [showModal,  setModal]     = useState(false);
  const [name,       setName]      = useState('');
  const [dni,        setDni]       = useState('');
  const [age,        setAge]       = useState('');
  const [error,      setError]     = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q
      ? patients.filter(p => p.name.toLowerCase().includes(q) || p.identityCard.includes(q))
      : patients;
  }, [patients, query]);

  const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !dni.trim()) { setError(t('pat_modal_error_req')); return; }
    try {
      await addPatient({ name: name.trim(), identityCard: dni.trim(), age: age ? parseInt(age) : undefined });
      setName(''); setDni(''); setAge('');
      setModal(false);
    } catch (err: any) {
      setError(err.message || 'Error al registrar paciente.');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('pat_title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('pat_subtitle')}</p>
        </div>
        <Button
          onClick={() => setModal(true)}
          className="self-start sm:self-auto bg-[#0F4C81] hover:bg-[#0a3a63] shadow-sm hover:shadow-md transition-all"
        >
          <PlusCircle size={16} strokeWidth={2} />
          {t('pat_register')}
        </Button>
      </div>

      {/* ── Search + counter ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
          <Input
            className="pl-10 h-11 border-slate-200 bg-white focus:border-[#0F4C81]/50 focus:ring-[#0F4C81]/10 shadow-premium"
            placeholder={t('pat_search_placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-premium">
          <Users size={15} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-700">{filtered.length}</span>
          <span className="text-xs text-slate-400">pacientes</span>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100">
              {[t('pat_col_name'), t('pat_col_dni'), t('pat_col_age')].map(h => (
                <th key={h} className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Users size={24} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600">{t('pat_no_found')}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {query ? 'Ajusta el término de búsqueda' : 'Registra el primer paciente'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-xs font-bold shrink-0">
                      {initials(p.name)}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {p.identityCard}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {p.age ? `${p.age} ${t('years')}` : (
                    <span className="text-slate-300">{t('na')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-xs text-slate-500 font-medium">
              {filtered.length} paciente{filtered.length !== 1 ? 's' : ''} registrado{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* ── Add patient modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm animate-fade-in"
            onClick={() => setModal(false)}
          />
          <div className="relative w-full max-w-md z-10 bg-white rounded-2xl shadow-premium-lg border border-slate-200/60 overflow-hidden animate-scale-in">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0F4C81]/8 border border-[#0F4C81]/15">
                  <User size={16} className="text-[#0F4C81]" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{t('pat_modal_title')}</h3>
              </div>
              <button
                onClick={() => setModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {error && (
                <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">{t('pat_modal_name')}</Label>
                  <Input
                    className="mt-1.5 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    placeholder="Ej: Laura Dantas"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">{t('pat_modal_dni')}</Label>
                  <Input
                    className="mt-1.5 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    placeholder="Ej: 111.222.333-44"
                    value={dni}
                    onChange={e => setDni(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    {t('pat_modal_age')} <span className="text-slate-400 font-normal">({t('optional')})</span>
                  </Label>
                  <Input
                    type="number"
                    className="mt-1.5 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50"
                    placeholder="Ej: 34"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setModal(false)}
                    className="hover:bg-slate-100"
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#0F4C81] hover:bg-[#0a3a63] shadow-sm"
                  >
                    {t('save_patient')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

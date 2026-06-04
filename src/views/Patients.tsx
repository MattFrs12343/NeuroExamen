import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { PlusCircle, Search, X, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { cn } from '../lib/utils';

export const Patients: React.FC = () => {
  const { t } = useTranslation();
  const { patients, addPatient } = useApp();

  const [query, setQuery]       = useState('');
  const [showModal, setModal]   = useState(false);
  const [name, setName]         = useState('');
  const [dni, setDni]           = useState('');
  const [age, setAge]           = useState('');
  const [error, setError]       = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? patients.filter(p => p.name.toLowerCase().includes(q) || p.identityCard.includes(q)) : patients;
  }, [patients, query]);

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('pat_title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('pat_subtitle')}</p>
        </div>
        <Button onClick={() => setModal(true)} className="self-start sm:self-auto">
          <PlusCircle size={15} />
          {t('pat_register')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder={t('pat_search_placeholder')} value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              {[t('pat_col_name'), t('pat_col_dni'), t('pat_col_age')].map(h => (
                <th key={h} className="px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-sm text-muted-foreground">
                  {t('pat_no_found')}
                </td>
              </tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[11px]">{initials(p.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 font-mono text-sm text-muted-foreground">{p.identityCard}</td>
                <td className="px-5 py-3.5 text-sm text-muted-foreground">
                  {p.age ? `${p.age} ${t('years')}` : t('na')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">{filtered.length} paciente{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </Card>

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm animate-fade-in" onClick={() => setModal(false)} />
          <Card className={cn('relative w-full max-w-md z-10 animate-fade-in shadow-panel')}>
            <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User size={15} className="text-primary" />
                {t('pat_modal_title')}
              </CardTitle>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <X size={15} />
              </button>
            </CardHeader>
            <CardContent className="pt-5">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>{t('pat_modal_name')}</Label>
                  <Input placeholder="Ej: Laura Dantas" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <Label>{t('pat_modal_dni')}</Label>
                  <Input placeholder="Ej: 111.222.333-44" value={dni} onChange={e => setDni(e.target.value)} />
                </div>
                <div>
                  <Label>{t('pat_modal_age')} ({t('optional')})</Label>
                  <Input type="number" placeholder="Ej: 34" value={age} onChange={e => setAge(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="ghost" onClick={() => setModal(false)}>{t('cancel')}</Button>
                  <Button type="submit">{t('save_patient')}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

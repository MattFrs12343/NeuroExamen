import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from './ui/input';
import { getErrorMessage } from '../lib/utils';

/**
 * Renombra la FICHA REAL del paciente (updatePatient) desde los formularios de
 * documentos (Pedidos/Recetas/etc.). Necesario porque al editar un documento y
 * cambiar el texto del nombre NO se renombraba al paciente: se creaba uno nuevo
 * (duplicado) o no pasaba nada. Como el nombre de los historiales sale de un
 * JOIN vivo a `patients`, al renombrar acá se corrige en TODOS los documentos.
 * `onRenamed` sincroniza el campo de búsqueda del formulario que lo usa.
 */
export const EditPatientNameButton: React.FC<{
  patientId: string;
  onRenamed?: (newName: string) => void;
}> = ({ patientId, onRenamed }) => {
  const { t } = useTranslation();
  const { patients, updatePatient } = useApp();
  const patient = patients.find(p => p.id === patientId);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  if (!patient) return null;

  const start = () => { setName(patient.name); setOpen(true); };

  const save = async () => {
    const next = name.trim();
    if (!next || next === patient.name) { setOpen(false); return; }
    setSaving(true);
    try {
      await updatePatient({ ...patient, name: next });
      onRenamed?.(next);
      setOpen(false);
      alert(t('pat_edit_success'));
    } catch (e) {
      alert(t('save_error_msg', { message: getErrorMessage(e) }));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={start}
        className="mt-2 ml-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#0F4C81] bg-[#0F4C81]/8 border border-[#0F4C81]/20 hover:bg-[#0F4C81]/12 rounded-xl px-3 py-1.5 transition-colors align-top">
        <Pencil size={12} strokeWidth={2.5} />
        {t('patient_fix_name')}
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <Input
        autoFocus
        className="h-10 max-w-xs border-slate-200 bg-white focus:border-[#0F4C81]/50"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
      />
      <button type="button" onClick={save} disabled={saving}
        className="flex items-center gap-1.5 h-10 px-3 bg-[#0F4C81] hover:bg-[#0a3a63] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shrink-0">
        <Check size={14} strokeWidth={2.5} />
        {t('save')}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 shrink-0">
        <X size={14} />
      </button>
    </div>
  );
};

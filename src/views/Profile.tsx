import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import {
  Mail, ShieldCheck, Calendar, Lock, LogOut, User,
  CheckCircle2, AlertCircle, KeyRound, Pencil
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { cn } from '../lib/utils';

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost/neuro-api/api';
const getToken = () => localStorage.getItem('neuro_token') || '';

type MsgState = { text: string; type: 'success' | 'error' } | null;

const Feedback = ({ msg }: { msg: MsgState }) => {
  if (!msg) return null;
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-xl border text-sm font-medium',
      msg.type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-red-50 text-red-600 border-red-200'
    )}>
      {msg.type === 'success'
        ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
        : <AlertCircle  size={16} className="shrink-0 mt-0.5" />}
      {msg.text}
    </div>
  );
};

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, setCurrentUser, logout } = useApp();

  const [nameVal,  setNameVal]  = useState(currentUser?.name  || '');
  const [emailVal, setEmailVal] = useState(currentUser?.email || '');
  const [profMsg,  setProfMsg]  = useState<MsgState>(null);
  const [profLoad, setProfLoad] = useState(false);

  const [curPwd,   setCurPwd]  = useState('');
  const [newPwd,   setNewPwd]  = useState('');
  const [confPwd,  setConfPwd] = useState('');
  const [passMsg,  setPassMsg] = useState<MsgState>(null);
  const [passLoad, setPassLoad] = useState(false);

  const initials = (currentUser?.name ?? '?')
    .split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const regDate = currentUser?.registrationDate
    ? new Date(currentUser.registrationDate).toLocaleDateString() : '—';

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setProfMsg(null);
    if (!nameVal.trim() || !emailVal.trim()) {
      setProfMsg({ text: t('prof_error_req'), type: 'error' }); return;
    }
    setProfLoad(true);
    try {
      const res  = await fetch(`${API}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: nameVal.trim(), email: emailVal.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setProfMsg({ text: data.error || 'Error', type: 'error' }); return; }
      const updated = { ...currentUser!, name: data.name, email: data.email };
      localStorage.setItem('neuro_user', JSON.stringify(updated));
      setCurrentUser(updated);
      setProfMsg({ text: t('prof_update_success'), type: 'success' });
    } catch { setProfMsg({ text: 'No se pudo conectar.', type: 'error' }); }
    finally { setProfLoad(false); }
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPassMsg(null);
    if (!curPwd || !newPwd || !confPwd) { setPassMsg({ text: t('prof_pass_error_req'),   type: 'error' }); return; }
    if (newPwd !== confPwd)             { setPassMsg({ text: t('prof_pass_error_match'), type: 'error' }); return; }
    if (newPwd.length < 6)             { setPassMsg({ text: t('prof_pass_error_len'),   type: 'error' }); return; }
    setPassLoad(true);
    try {
      const res  = await fetch(`${API}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setPassMsg({ text: data.error || 'Error', type: 'error' }); return; }
      setPassMsg({ text: t('prof_pass_success'), type: 'success' });
      setCurPwd(''); setNewPwd(''); setConfPwd('');
    } catch { setPassMsg({ text: 'No se pudo conectar.', type: 'error' }); }
    finally { setPassLoad(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('prof_title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('prof_subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Identity card ─────────────────────────────────────────────── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">

          {/* Avatar + nombre — sin franja que tape */}
          <div className="p-6 flex flex-col items-center text-center gap-4 border-b border-slate-100">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-[#0F4C81]/10 text-[#0F4C81] flex items-center justify-center text-2xl font-bold border-2 border-[#0F4C81]/15">
                {initials}
              </div>
              <button className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 shadow-sm transition-all">
                <Pencil size={12} />
              </button>
            </div>

            <div>
              <p className="text-base font-bold text-slate-900 leading-tight">{currentUser?.name}</p>
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">
                  {currentUser?.specialty ?? t('print_doc_specialty')}
                </span>
              </div>
            </div>
          </div>

          {/* Info list */}
          <div className="px-6 py-5 space-y-3.5">
            {[
              { icon: Mail,        label: t('login_email'),   value: currentUser?.email },
              { icon: ShieldCheck, label: t('specialty'),     value: t('prof_license') },
              { icon: Calendar,    label: t('prof_reg_date'), value: regDate },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                  <Icon size={13} className="text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Logout */}
          <div className="px-6 pb-6 pt-2 border-t border-slate-100">
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
            >
              <LogOut size={16} />
              {t('logout')}
            </button>
          </div>
        </div>

        {/* ── Forms ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal info */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-[#0F4C81]/8 border border-[#0F4C81]/15">
                <User size={16} className="text-[#0F4C81]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t('prof_personal_info')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Actualiza tu nombre y dirección de correo</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <Feedback msg={profMsg} />
              <form onSubmit={handleProfile} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">{t('prof_name_label')}</Label>
                  <Input
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    placeholder={t('prof_name_placeholder')}
                    className="mt-1.5 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 focus:ring-[#0F4C81]/10"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">{t('login_email')}</Label>
                  <div className="relative mt-1.5">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
                    <Input
                      type="email"
                      value={emailVal}
                      onChange={e => setEmailVal(e.target.value)}
                      placeholder={t('prof_email_placeholder')}
                      className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 focus:ring-[#0F4C81]/10"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={profLoad}
                    className="bg-[#0F4C81] hover:bg-[#0a3a63] shadow-sm"
                  >
                    {profLoad ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
                    ) : t('prof_save_btn')}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Password */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                <KeyRound size={16} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{t('prof_security')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Cambia tu contraseña de acceso al sistema</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <Feedback msg={passMsg} />
              <form onSubmit={handlePassword} className="space-y-4">
                {[
                  { label: t('prof_cur_pass'),     val: curPwd,  setter: setCurPwd,  ph: '••••••••' },
                  { label: t('prof_new_pass'),     val: newPwd,  setter: setNewPwd,  ph: 'Mínimo 6 caracteres' },
                  { label: t('prof_confirm_pass'), val: confPwd, setter: setConfPwd, ph: t('prof_confirm_pass') },
                ].map(({ label, val, setter, ph }) => (
                  <div key={label}>
                    <Label className="text-xs font-semibold text-slate-700">{label}</Label>
                    <div className="relative mt-1.5">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.75} />
                      <Input
                        type="password"
                        value={val}
                        onChange={e => setter(e.target.value)}
                        placeholder={ph}
                        className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white focus:border-[#0F4C81]/50 focus:ring-[#0F4C81]/10"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={passLoad}
                    className="bg-[#0F4C81] hover:bg-[#0a3a63] shadow-sm"
                  >
                    {passLoad ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Actualizando...</>
                    ) : t('prof_update_btn')}
                  </Button>
                </div>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

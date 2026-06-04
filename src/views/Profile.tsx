import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { Mail, ShieldCheck, Calendar, Lock, LogOut, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost/neuro-api/api';
const getToken = () => localStorage.getItem('neuro_token') || '';

type MsgState = { text: string; type: 'success' | 'error' } | null;

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, setCurrentUser, logout } = useApp();

  const [nameVal,  setNameVal]  = useState(currentUser?.name  || '');
  const [emailVal, setEmailVal] = useState(currentUser?.email || '');
  const [profMsg,  setProfMsg]  = useState<MsgState>(null);
  const [profLoad, setProfLoad] = useState(false);

  const [curPwd,  setCurPwd]  = useState('');
  const [newPwd,  setNewPwd]  = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [passMsg, setPassMsg] = useState<MsgState>(null);
  const [passLoad,setPassLoad] = useState(false);

  const initials = (currentUser?.name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const regDate  = currentUser?.registrationDate
    ? new Date(currentUser.registrationDate).toLocaleDateString() : '—';

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setProfMsg(null);
    if (!nameVal.trim() || !emailVal.trim()) { setProfMsg({ text: t('prof_error_req'), type: 'error' }); return; }
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
    if (!curPwd || !newPwd || !confPwd) { setPassMsg({ text: t('prof_pass_error_req'), type: 'error' }); return; }
    if (newPwd !== confPwd)             { setPassMsg({ text: t('prof_pass_error_match'), type: 'error' }); return; }
    if (newPwd.length < 6)             { setPassMsg({ text: t('prof_pass_error_len'), type: 'error' }); return; }
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

  const Feedback = ({ msg }: { msg: MsgState }) => msg ? (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs font-medium ${
      msg.type === 'success'
        ? 'bg-teal-50 text-teal-700 border-teal-200'
        : 'bg-red-50 text-red-600 border-red-200'
    }`}>
      {msg.type === 'success'
        ? <CheckCircle size={14} className="shrink-0 mt-0.5" />
        : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
      {msg.text}
    </div>
  ) : null;

  return (
    <div className="space-y-6">

      <h1 className="text-xl font-bold text-slate-900">{t('prof_title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Overview card */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-5">
          {/* Avatar */}
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-sky-100 text-sky-700 text-2xl font-bold shadow-sm">
            {initials}
          </div>

          <div>
            <p className="text-base font-bold text-slate-900">{currentUser?.name}</p>
            <span className="inline-block mt-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
              {currentUser?.specialty ?? t('print_doc_specialty')}
            </span>
          </div>

          <div className="w-full border-t border-slate-100 pt-4 space-y-3 text-left">
            {[
              { icon: Mail,       label: t('login_email'),   value: currentUser?.email },
              { icon: ShieldCheck,label: t('specialty'),     value: t('prof_license') },
              { icon: Calendar,   label: t('prof_reg_date'), value: regDate },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon size={15} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xs text-slate-700 font-medium truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full border-t border-slate-100 pt-4">
            <Button variant="destructive" size="sm" className="w-full" onClick={logout}>
              <LogOut size={14} />
              {t('logout')}
            </Button>
          </div>
        </div>

        {/* Forms */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <User size={15} className="text-sky-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t('prof_personal_info')}</h2>
            </div>
            <Feedback msg={profMsg} />
            <form onSubmit={handleProfile} className="space-y-4 max-w-md">
              <div>
                <Label>{t('prof_name_label')}</Label>
                <Input value={nameVal} onChange={e => setNameVal(e.target.value)}
                  placeholder={t('prof_name_placeholder')}
                  className="border-slate-200 bg-slate-50 focus:bg-white" />
              </div>
              <div>
                <Label>{t('login_email')}</Label>
                <Input type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)}
                  placeholder={t('prof_email_placeholder')}
                  className="border-slate-200 bg-slate-50 focus:bg-white" />
              </div>
              <Button type="submit" disabled={profLoad} className="bg-sky-600 hover:bg-sky-700">
                {profLoad ? 'Guardando...' : t('prof_save_btn')}
              </Button>
            </form>
          </div>

          {/* Password */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Lock size={15} className="text-sky-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t('prof_security')}</h2>
            </div>
            <Feedback msg={passMsg} />
            <form onSubmit={handlePassword} className="space-y-4 max-w-md">
              <div>
                <Label>{t('prof_cur_pass')}</Label>
                <Input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)}
                  placeholder="••••••••"
                  className="border-slate-200 bg-slate-50 focus:bg-white" />
              </div>
              <div>
                <Label>{t('prof_new_pass')}</Label>
                <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="border-slate-200 bg-slate-50 focus:bg-white" />
              </div>
              <div>
                <Label>{t('prof_confirm_pass')}</Label>
                <Input type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)}
                  placeholder={t('prof_confirm_pass')}
                  className="border-slate-200 bg-slate-50 focus:bg-white" />
              </div>
              <Button type="submit" disabled={passLoad} className="bg-sky-600 hover:bg-sky-700">
                {passLoad ? 'Actualizando...' : t('prof_update_btn')}
              </Button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

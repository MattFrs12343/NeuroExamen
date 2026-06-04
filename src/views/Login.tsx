import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '../context/AppContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { cn } from '../lib/utils';
import cerebroLogo from '../assets/cerebro.png';

const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost/neuro-api/api';

const getSchema = (t: (k: string) => string) => z.object({
  email:    z.string().min(1, t('val_email_req')).email(t('val_email_invalid')),
  password: z.string().min(1, t('val_pass_req')).min(6, t('val_pass_min')),
});
type LoginForm = z.infer<ReturnType<typeof getSchema>>;

export const Login: React.FC = () => {
  const { setCurrentUser, setCurrentView } = useApp();
  const { t } = useTranslation();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const schema = useMemo(() => getSchema(t), [t]);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const json = await res.json();
      if (res.ok) {
        localStorage.setItem('neuro_user',  JSON.stringify(json.user));
        localStorage.setItem('neuro_token', json.token);
        setCurrentUser(json.user);
        setCurrentView('dashboard');
      } else {
        setError(json.error || t('login_error_invalid'));
      }
    } catch {
      setError('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Panel izquierdo ───────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">

        {/* Líneas decorativas sutiles */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Orb de color — sin tocar el logo */}
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-sky-600/20 blur-3xl -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-teal-500/15 blur-3xl translate-x-1/3 -translate-y-1/3" />

        <div className="relative z-10 flex flex-col justify-between w-full p-14">

          {/* Logo — sin fondo, solo imagen + texto */}
          <div className="flex items-center gap-3">
            <img src={cerebroLogo} alt="NeuroExámenes" className="w-9 h-9 object-contain" />
            <span className="text-base font-semibold text-white/90 tracking-wide">NeuroExámenes</span>
          </div>

          {/* Headline central */}
          <div className="max-w-sm">
            <p className="text-xs font-semibold text-sky-400 uppercase tracking-[0.2em] mb-4">
              {t('login_brand_subtitle')}
            </p>
            <h2 className="text-4xl font-bold text-white leading-tight">
              {t('login_brand_tagline')}
            </h2>
          </div>

          {/* Pie */}
          <p className="text-xs text-white/30">© {new Date().getFullYear()} NeuroExámenes</p>
        </div>
      </div>

      {/* ── Panel derecho — formulario ────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">

        {/* Logo mobile */}
        <div className="flex items-center gap-3 mb-10 lg:hidden">
          <img src={cerebroLogo} alt="NeuroExámenes" className="w-8 h-8 object-contain" />
          <span className="text-sm font-semibold text-slate-800">NeuroExámenes</span>
        </div>

        <div className="w-full max-w-sm">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('login_title')}</h1>
            <p className="text-sm text-slate-500 mt-1.5">{t('login_subtitle')}</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                {t('login_email')}
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  type="email"
                  placeholder={t('login_email')}
                  {...register('email')}
                  className={cn(
                    'pl-10 h-11 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white',
                    errors.email && 'border-red-300 focus:ring-red-200'
                  )}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                {t('login_password')}
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={cn(
                    'pl-10 pr-11 h-11 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white',
                    errors.password && 'border-red-300 focus:ring-red-200'
                  )}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={11} /> {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold mt-1" disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('loading')}
                </>
              ) : t('login_btn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

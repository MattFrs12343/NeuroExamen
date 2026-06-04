import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '../context/AppContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
  const [error,   setError]   = useState<string | null>(null);
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
      setError('No se pudo conectar con el servidor.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">

      {/* Fondo sutil */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-[#0F4C81]/5" />
        <div className="absolute -bottom-40 -left-20 w-[360px] h-[360px] rounded-full bg-[#4A90E2]/6" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.018]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="#0F4C81" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="relative w-full max-w-[420px]">

        {/* Branding */}
        <div className="flex flex-col items-center mb-10 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#0F4C81] flex items-center justify-center shadow-lg">
              <img src={cerebroLogo} alt="NeuroExámenes" className="w-9 h-9 object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#0F4C81] tracking-tight">NeuroExámenes</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Plataforma de gestión neurológica clínica
            </p>
          </div>
        </div>

        {/* Card del formulario */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,76,129,0.10)] p-8">

          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                {t('login_email')}
              </label>
              <div className="relative">
                <Mail size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="doctor@ejemplo.com"
                  {...register('email')}
                  className={cn(
                    'w-full h-12 pl-12 pr-4 rounded-xl border bg-slate-50 text-slate-900 text-sm',
                    'placeholder:text-slate-400 outline-none transition-all duration-150',
                    'focus:bg-white focus:border-[#4A90E2] focus:ring-3 focus:ring-[#4A90E2]/15',
                    errors.email ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200'
                  )}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                  <AlertCircle size={12} strokeWidth={2} /> {errors.email.message}
                </p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  {t('login_password')}
                </label>
                <button type="button" className="text-xs font-medium text-[#4A90E2] hover:text-[#0F4C81] transition-colors">
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={cn(
                    'w-full h-12 pl-12 pr-12 rounded-xl border bg-slate-50 text-slate-900 text-sm',
                    'placeholder:text-slate-400 outline-none transition-all duration-150',
                    'focus:bg-white focus:border-[#4A90E2] focus:ring-3 focus:ring-[#4A90E2]/15',
                    errors.password ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPwd ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                  <AlertCircle size={12} strokeWidth={2} /> {errors.password.message}
                </p>
              )}
            </div>

            {/* Botón entrar */}
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full h-12 rounded-xl text-white text-sm font-bold mt-2',
                'bg-[#0F4C81] hover:bg-[#0d4070] active:bg-[#0a3560]',
                'shadow-[0_4px_14px_0_rgba(15,76,129,0.35)] hover:shadow-[0_6px_20px_0_rgba(15,76,129,0.45)]',
                'transition-all duration-150 flex items-center justify-center gap-2.5',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none'
              )}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('loading')}</span>
                </>
              ) : t('login_btn')}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          © {new Date().getFullYear()} NeuroExámenes · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
};

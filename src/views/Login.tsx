import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useApp } from '../context/AppContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Activity, Brain, Zap, Shield } from 'lucide-react';
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

// ── Neural network background pattern ───────────────────────────────────────
const NeuralPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="neural" width="100" height="100" patternUnits="userSpaceOnUse">
        <circle cx="50" cy="50" r="2" fill="white" opacity="0.5"/>
        <line x1="0" y1="0" x2="50" y2="50" stroke="white" strokeWidth="0.5" opacity="0.3"/>
        <line x1="100" y1="0" x2="50" y2="50" stroke="white" strokeWidth="0.5" opacity="0.3"/>
        <line x1="0" y1="100" x2="50" y2="50" stroke="white" strokeWidth="0.5" opacity="0.3"/>
        <line x1="100" y1="100" x2="50" y2="50" stroke="white" strokeWidth="0.5" opacity="0.3"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#neural)" />
  </svg>
);

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

  const features = [
    { icon: Brain,    label: 'Diagnóstico neurológico avanzado',   desc: 'Basado en protocolos internacionales' },
    { icon: Zap,      label: 'Creación de pedidos en < 60s',       desc: 'Optimizado para alta demanda clínica' },
    { icon: Activity, label: 'Integración con sistemas DICOM',     desc: 'Compatible con equipos de resonancia' },
    { icon: Shield,   label: 'Cumplimiento HIPAA & LGPD',          desc: 'Seguridad certificada para datos médicos' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ══════════════════════════════════════════════════════════════════
          LEFT PANEL — Premium Medical Brand Experience
      ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden bg-gradient-to-br from-[#0F4C81] via-[#0a3a63] to-[#062943]">
        
        {/* Neural network pattern */}
        <NeuralPattern />

        {/* Gradient orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#06B6D4]/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#10B981]/10 to-transparent blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">

          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <img src={cerebroLogo} alt="NeuroExámenes" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <p className="text-xl font-bold text-white tracking-tight">NeuroExámenes</p>
              <p className="text-xs text-white/60 font-medium mt-0.5">Medical Platform</p>
            </div>
          </div>

          {/* Main message */}
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                Plataforma Certificada ISO 27001
              </span>
            </div>

            <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Sistema de Gestión<br/>
              Neurológica Premium
            </h1>

            <p className="text-lg text-white/70 leading-relaxed">
              Plataforma SaaS diseñada para neurólogos y centros especializados.
              Diagnósticos precisos, flujos optimizados, cumplimiento normativo.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 gap-4 pt-4">
              {features.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all">
                  <div className="p-2 rounded-lg bg-white/10 shrink-0">
                    <Icon size={20} className="text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-white/60 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-white/40">
            <p>© {new Date().getFullYear()} NeuroExámenes. Todos los derechos reservados.</p>
            <p>v2.0.0</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT PANEL — Login Form (Premium Card)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        
        {/* Logo mobile */}
        <div className="absolute top-6 left-6 flex items-center gap-2.5 lg:hidden">
          <img src={cerebroLogo} alt="NeuroExámenes" className="w-7 h-7 object-contain" />
          <span className="text-sm font-semibold text-slate-800">NeuroExámenes</span>
        </div>

        {/* Premium floating card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-premium-lg border border-slate-200/60 p-8 lg:p-10">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('login_title')}</h1>
              <p className="text-sm text-slate-500 mt-2">{t('login_subtitle')}</p>
            </div>

            {/* Error feedback */}
            {error && (
              <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-red-100">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-500" strokeWidth={2} />
                <p className="text-sm text-red-600 leading-snug">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('login_email')}
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.5} />
                  <Input
                    type="email"
                    placeholder="doctor@ejemplo.com"
                    {...register('email')}
                    className={cn(
                      'pl-12 h-12 text-base border-slate-200 bg-slate-50/50 placeholder:text-slate-400',
                      'focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
                      'transition-all',
                      errors.email && 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                    <AlertCircle size={12} /> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {t('login_password')}
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" strokeWidth={1.5} />
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    className={cn(
                      'pl-12 pr-12 h-12 text-base border-slate-200 bg-slate-50/50 placeholder:text-slate-400',
                      'focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
                      'transition-all',
                      errors.password && 'border-red-300 focus:border-red-400 focus:ring-red-100'
                    )}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPwd ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1.5">
                    <AlertCircle size={12} /> {errors.password.message}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all mt-6" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('loading')}
                  </>
                ) : t('login_btn')}
              </Button>
            </form>

            {/* Footer note */}
            <p className="text-xs text-center text-slate-400 mt-8">
              Plataforma protegida con cifrado SSL/TLS y autenticación JWT
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

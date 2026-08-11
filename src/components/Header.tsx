import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { Menu, ChevronDown, User as UserIcon, LogOut, Globe } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { currentUser, logout, setCurrentView, currentView } = useApp();
  const { t, i18n } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [showLang, setShowLang] = useState(false);

  const viewTitle: Record<string, { label: string; sub?: string }> = {
    dashboard:   { label: t('nav_dashboard'),     sub: 'Panel de control clínico' },
    orders:      { label: t('nav_orders'),        sub: 'Gestión de pedidos médicos' },
    'new-order': { label: t('new_order_title'),   sub: 'Solicitud de exámenes neurológicos' },
    profile:     { label: t('nav_profile'),       sub: 'Configuración de cuenta' },
    patients:    { label: t('nav_patients'),      sub: 'Directorio de pacientes' },
    recetas:     { label: t('nav_recetas'),       sub: 'Gestión de recetas médicas' },
    'new-receta': { label: t('new_receta_title'), sub: 'Prescripción de medicamentos' },
    encaminhamentos:     { label: t('nav_encaminhamentos'),      sub: 'Encaminhamentos para especialistas' },
    'new-encaminhamento': { label: t('new_encaminhamento_title'), sub: 'Encaminhamento para especialista' },
  };

  const current = viewTitle[currentView] ?? { label: 'NeuroExámenes', sub: '' };

  const initials = currentUser
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'DR';

  const langs = [
    { code: 'pt', flag: '🇧🇷', label: 'Português' },
    { code: 'es', flag: '🇪🇸', label: 'Español' },
    { code: 'en', flag: '🇺🇸', label: 'English' },
  ];
  const currentLang = langs.find(l => l.code === i18n.language) ?? langs[0];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-5 lg:px-6 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 no-print">

      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="Menú"
        >
          <Menu size={18} />
        </button>

        {/* Page title + breadcrumb */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400 hidden sm:block">NeuroExámenes</span>
            <span className="text-slate-300 text-xs hidden sm:block">›</span>
            <h1 className="text-sm font-bold text-slate-800 tracking-tight">{current.label}</h1>
          </div>
          {current.sub && (
            <p className="text-xs text-slate-400 leading-none mt-0.5 hidden sm:block">{current.sub}</p>
          )}
        </div>
      </div>

      {/* Right: lang + profile */}
      <div className="flex items-center gap-2">

        {/* Language dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowLang(!showLang); setShowMenu(false); }}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
              'border border-transparent hover:border-slate-200 hover:bg-slate-50',
              'text-slate-500 hover:text-slate-700 transition-all'
            )}
          >
            <Globe size={15} strokeWidth={1.75} />
            <span className="hidden sm:block">{currentLang.flag} {currentLang.label}</span>
            <span className="sm:hidden">{currentLang.flag}</span>
          </button>
          {showLang && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLang(false)} />
              <div className="absolute right-0 top-full mt-2 w-44 z-50 bg-white border border-slate-200 rounded-xl shadow-premium-lg overflow-hidden animate-fade-in">
                {langs.map(l => (
                  <button key={l.code}
                    onClick={() => { i18n.changeLanguage(l.code); setShowLang(false); }}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors',
                      i18n.language === l.code
                        ? 'bg-[#0F4C81]/5 text-[#0F4C81] font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                    {i18n.language === l.code && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0F4C81]" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200" />

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowMenu(!showMenu); setShowLang(false); }}
            className={cn(
              'flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-xl',
              'border border-transparent hover:border-slate-200 hover:bg-slate-50',
              'transition-all'
            )}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-bold shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block whitespace-nowrap max-w-[140px] truncate">
              {currentUser?.name ?? ''}
            </span>
            <ChevronDown size={14} className="text-slate-400 shrink-0" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-white border border-slate-200 rounded-xl shadow-premium-lg overflow-hidden animate-fade-in">
                <div className="px-4 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#0F4C81]/10 text-[#0F4C81] text-sm font-bold">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{currentUser?.name}</p>
                      <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => { setCurrentView('profile'); setShowMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <UserIcon size={15} className="text-slate-400" />
                    {t('header_view_profile')}
                  </button>
                  <div className="my-1.5 h-px bg-slate-100 mx-3" />
                  <button
                    onClick={() => { logout(); setShowMenu(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    {t('logout')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

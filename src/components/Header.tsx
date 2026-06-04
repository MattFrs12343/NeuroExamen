import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { Menu, ChevronDown, User as UserIcon, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { currentUser, logout, setCurrentView, currentView } = useApp();
  const { t, i18n } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const viewTitle: Record<string, string> = {
    dashboard:   t('nav_dashboard'),
    orders:      t('nav_orders'),
    'new-order': t('new_order_title'),
    profile:     t('nav_profile'),
  };

  const initials = currentUser
    ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'DR';

  return (
    /* h-16 = mismo que el sidebar para alineación perfecta */
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-5 bg-white border-b border-slate-200 no-print">

      {/* Izquierda: hamburger (mobile) + título de la vista */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Menú"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-sm font-semibold text-slate-800">
          {viewTitle[currentView] ?? 'NeuroExámenes'}
        </h1>
      </div>

      {/* Derecha: idioma + perfil */}
      <div className="flex items-center gap-3">

        {/* Selector de idioma */}
        <select
          value={i18n.language}
          onChange={e => i18n.changeLanguage(e.target.value)}
          className="h-8 text-xs font-medium bg-slate-50 border border-slate-200 text-slate-500 rounded-lg px-2.5 focus:outline-none focus:ring-2 focus:ring-sky-200 cursor-pointer hover:bg-slate-100 transition-colors"
        >
          <option value="pt">🇧🇷 PT</option>
          <option value="es">🇪🇸 ES</option>
          <option value="en">🇺🇸 EN</option>
        </select>

        {/* Separador */}
        <div className="w-px h-5 bg-slate-200" />

        {/* Perfil */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all focus:outline-none"
          >
            {/* Avatar iniciales */}
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 text-sky-700 text-xs font-bold shrink-0">
              {initials}
            </div>
            {/* Nombre completo — sin truncar, suficiente espacio */}
            <span className="text-sm font-medium text-slate-700 hidden sm:block whitespace-nowrap">
              {currentUser?.name ?? ''}
            </span>
            <ChevronDown size={14} className="text-slate-400 shrink-0" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className={cn(
                'absolute right-0 top-full mt-2 w-60 z-50',
                'bg-white border border-slate-200 rounded-xl shadow-lg',
                'animate-fade-in overflow-hidden'
              )}>
                {/* Info del usuario */}
                <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">{currentUser?.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{currentUser?.email}</p>
                </div>
                <div className="py-1.5">
                  <button
                    onClick={() => { setCurrentView('profile'); setShowMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <UserIcon size={14} className="text-slate-400" />
                    {t('header_view_profile')}
                  </button>
                  <div className="my-1 h-px bg-slate-100 mx-2" />
                  <button
                    onClick={() => { logout(); setShowMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} />
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

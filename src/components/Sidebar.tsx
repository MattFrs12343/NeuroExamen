import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { ViewType } from '../types';
import { LayoutDashboard, FileText, LogOut, X, Pill, Stethoscope, ChevronDown, FileCheck, Milk, NotebookPen, Scale } from 'lucide-react';
import { cn } from '../lib/utils';
import { ENC_PROFILES, ENC_PROFILE_KEYS } from '../data/encaminhamentoProfiles';
import cerebroLogo from '../assets/cerebro.png';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { currentView, setCurrentView, logout, activeEncProfile, setActiveEncProfile } = useApp();
  const { t } = useTranslation();
  const [encOpen, setEncOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard'     as ViewType, label: t('nav_dashboard'),     icon: LayoutDashboard },
    { id: 'orders'        as ViewType, label: t('nav_orders'),        icon: FileText },
    { id: 'recetas'       as ViewType, label: t('nav_recetas'),       icon: Pill },
    { id: 'atestados'     as ViewType, label: t('nav_atestados'),     icon: FileCheck },
    { id: 'formula-leite' as ViewType, label: t('nav_formula_leite'), icon: Milk },
    { id: 'receituarios'  as ViewType, label: t('nav_receituario'),   icon: NotebookPen },
    { id: 'laudos'        as ViewType, label: t('nav_laudos'),        icon: Scale },
  ];

  const isEncActive = currentView === 'encaminhamentos' || currentView === 'new-encaminhamento';
  const isActive = (id: ViewType) =>
    currentView === id ||
    (id === 'orders'    && currentView === 'new-order') ||
    (id === 'recetas'   && currentView === 'new-receta') ||
    (id === 'atestados' && currentView === 'new-atestado') ||
    (id === 'formula-leite' && currentView === 'new-formula-leite') ||
    (id === 'receituarios' && currentView === 'new-receituario') ||
    (id === 'laudos' && currentView === 'new-laudo');

  const encExpanded = encOpen || isEncActive;

  const openEncProfile = (key: (typeof ENC_PROFILE_KEYS)[number]) => {
    setActiveEncProfile(key);
    setCurrentView('encaminhamentos');
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        'fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64',
        'bg-white border-r border-slate-200/80',
        'transition-transform duration-300 ease-in-out lg:translate-x-0',
        isOpen ? 'translate-x-0 shadow-premium-lg' : '-translate-x-full'
      )}>

        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0F4C81]/8 border border-[#0F4C81]/12">
              <img src={cerebroLogo} alt="NeuroExámenes" className="w-5 h-5 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 tracking-tight">NeuroExámenes</p>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">Medical Platform</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Navigation ────────────────────────────────────────────────── */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
            Navegación
          </p>
          {menuItems.map(({ id, label, icon: Icon }) => {
            const active = isActive(id);
            return (
              <button
                key={id}
                onClick={() => { setCurrentView(id); setEncOpen(false); setIsOpen(false); }}
                className={cn(
                  'relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium',
                  'transition-all duration-150 group',
                  active
                    ? 'bg-[#0F4C81] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                )}
              >
                <Icon
                  size={17}
                  strokeWidth={active ? 2.5 : 2}
                  className={cn(
                    'transition-colors',
                    active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span className="font-medium">{label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70" />
                )}
              </button>
            );
          })}

          {/* ── Encaminhamentos — submenú de clínicas ───────────────────── */}
          <div>
            <button
              onClick={() => setEncOpen(o => !o)}
              className={cn(
                'relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-150 group',
                isEncActive
                  ? 'bg-[#0F4C81] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              )}
            >
              <Stethoscope
                size={17}
                strokeWidth={isEncActive ? 2.5 : 2}
                className={cn(
                  'transition-colors',
                  isEncActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              <span className="font-medium">{t('nav_encaminhamentos')}</span>
              <ChevronDown
                size={15}
                strokeWidth={2.5}
                className={cn(
                  'ml-auto transition-transform duration-200',
                  encExpanded ? 'rotate-180' : '',
                  isEncActive ? 'text-white/80' : 'text-slate-400'
                )}
              />
            </button>

            <div
              data-testid="enc-submenu"
              className={cn(
                'grid transition-all duration-300 ease-out overflow-hidden',
                encExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              )}
            >
              <div className="min-h-0">
                <div className="mt-1 ml-4 pl-3 space-y-1 border-l border-slate-200">
                  {ENC_PROFILE_KEYS.map(key => {
                    const p = ENC_PROFILES[key];
                    const activeProfile = key === activeEncProfile;
                    return (
                      <button
                        key={key}
                        onClick={() => openEncProfile(key)}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium',
                          'transition-all duration-150',
                          activeProfile
                            ? 'text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                        )}
                        style={activeProfile
                          ? { backgroundColor: p.primary, backgroundImage: `linear-gradient(135deg, ${p.primary}, ${p.primaryDark})` }
                          : undefined}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: activeProfile ? '#fff' : p.primary }}
                        />
                        <span className="font-medium">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Footer — logout only ──────────────────────────────────────── */}
        <div className="px-3 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
          >
            <LogOut size={16} strokeWidth={2} className="text-slate-400" />
            {t('logout')}
          </button>
        </div>
      </aside>
    </>
  );
};

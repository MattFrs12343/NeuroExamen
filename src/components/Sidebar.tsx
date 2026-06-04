import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { ViewType } from '../types';
import { LayoutDashboard, FileText, LogOut, X, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import cerebroLogo from '../assets/cerebro.png';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { currentView, setCurrentView, logout, currentUser } = useApp();
  const { t } = useTranslation();

  const menuItems = [
    { id: 'dashboard' as ViewType, label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'orders'    as ViewType, label: t('nav_orders'),    icon: FileText },
  ];

  const isActive = (id: ViewType) =>
    currentView === id || (id === 'orders' && currentView === 'new-order');

  const initials = (currentUser?.name ?? '?')
    .split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

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
                onClick={() => { setCurrentView(id); setIsOpen(false); }}
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
        </nav>

        {/* ── Footer — user & logout ─────────────────────────────────────── */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-1 shrink-0">
          {/* User info chip */}
          <button
            onClick={() => { setCurrentView('profile'); setIsOpen(false); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-slate-100/80 transition-all group"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0F4C81]/10 text-[#0F4C81] text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-slate-800 truncate">{currentUser?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
            </div>
            <Activity size={13} className="text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
          </button>

          {/* Logout */}
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

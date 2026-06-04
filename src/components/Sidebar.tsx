import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import type { ViewType } from '../types';
import { LayoutDashboard, FileText, LogOut, X } from 'lucide-react';
import { cn } from '../lib/utils';
import cerebroLogo from '../assets/cerebro.png';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { currentView, setCurrentView, logout } = useApp();
  const { t } = useTranslation();

  const menuItems = [
    { id: 'dashboard' as ViewType, label: t('nav_dashboard'), icon: LayoutDashboard },
    { id: 'orders'    as ViewType, label: t('nav_orders'),    icon: FileText },
  ];

  const isActive = (id: ViewType) =>
    currentView === id || (id === 'orders' && currentView === 'new-order');

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        'fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64',
        'bg-white border-r border-slate-200',
        'transition-transform duration-300 ease-in-out lg:translate-x-0',
        isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
      )}>

        {/* Branding — h-16 igual al header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Logo sin fondo */}
            <img src={cerebroLogo} alt="NeuroExámenes" className="w-7 h-7 object-contain" />
            <span className="text-sm font-semibold text-slate-800">NeuroExámenes</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Navegación
          </p>
          {menuItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setCurrentView(id); setIsOpen(false); }}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive(id)
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon
                size={17}
                strokeWidth={isActive(id) ? 2.5 : 1.8}
                className={isActive(id) ? 'text-sky-600' : 'text-slate-400'}
              />
              {label}
            </button>
          ))}
        </nav>

        {/* Logout — al pie */}
        <div className="px-3 py-4 border-t border-slate-200 shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
          >
            <LogOut size={17} strokeWidth={1.8} className="text-slate-400" />
            {t('logout')}
          </button>
        </div>
      </aside>
    </>
  );
};

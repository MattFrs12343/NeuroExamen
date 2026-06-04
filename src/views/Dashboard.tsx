import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getStatusBadgeVariant } from '../utils/orderUtils';
import {
  FileClock, Clock, UserCheck, PlusCircle, ArrowRight,
  TrendingUp, Sun, Sunset, Moon, Activity, CheckCircle2,
  AlertCircle, XCircle, ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import type { OrderStatus } from '../types';

// ── Greeting logic ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useGreeting(name: string, t: (key: string, opts?: any) => string) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)  return { text: t('dash_welcome_morning',   { name }), Icon: Sun,    colorCls: 'text-amber-500', bgFrom: '#FFF7ED', bgTo: '#FFFBEB', iconBg: 'bg-amber-50 border-amber-200', badge: 'Mañana clínica' };
  if (hour >= 12 && hour < 19) return { text: t('dash_welcome_afternoon', { name }), Icon: Sunset, colorCls: 'text-sky-500',   bgFrom: '#F0F9FF', bgTo: '#E0F2FE', iconBg: 'bg-sky-50 border-sky-200',     badge: 'Tarde clínica' };
  return                               { text: t('dash_welcome_evening',   { name }), Icon: Moon,   colorCls: 'text-indigo-500',bgFrom: '#EEF2FF', bgTo: '#E0E7FF', iconBg: 'bg-indigo-50 border-indigo-200',badge: 'Turno nocturno' };
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.FC<{size?:number;className?:string}>, cls: string }> = {
  Concluido: { label: 'Concluido', icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  Pendiente: { label: 'Pendiente', icon: AlertCircle,  cls: 'text-amber-600  bg-amber-50  border-amber-100'  },
  Cancelado: { label: 'Cancelado', icon: XCircle,      cls: 'text-slate-500  bg-slate-50  border-slate-200'  },
};

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { orders, setCurrentView, setActiveOrderForEdit, currentUser } = useApp();

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const doctorShortName = (() => {
    const raw = currentUser?.name ?? '';
    const clean = raw.replace(/^Dr[a]?\.\s*/i, '').trim();
    return clean.split(' ')[0] || raw;
  })();

  const greeting = useGreeting(doctorShortName, t);

  const ordersToday         = orders.filter(o => o.date === todayStr);
  const pendingOrders       = orders.filter(o => o.status === 'Pendiente');
  const concludedOrders     = orders.filter(o => o.status === 'Concluido');
  const uniquePatientsCount = new Set(orders.map(o => o.patientId)).size;
  const recentOrders        = [...orders].reverse().slice(0, 6);

  const metrics = [
    {
      label: t('dash_today_orders'),
      value: ordersToday.length,
      icon: FileClock,
      iconCls: 'text-[#0F4C81]',
      iconBg: 'bg-[#0F4C81]/8 border-[#0F4C81]/15',
      delta: '+2 vs ayer',
      trend: 'up',
    },
    {
      label: t('dash_pending'),
      value: pendingOrders.length,
      icon: Clock,
      iconCls: 'text-amber-600',
      iconBg: 'bg-amber-50 border-amber-100',
      delta: pendingOrders.length > 0 ? 'Requieren atención' : 'Todo al día',
      trend: pendingOrders.length > 0 ? 'warn' : 'up',
    },
    {
      label: t('dash_attended'),
      value: uniquePatientsCount,
      icon: UserCheck,
      iconCls: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border-emerald-100',
      delta: 'Pacientes totales',
      trend: 'up',
    },
    {
      label: 'Concluidos',
      value: concludedOrders.length,
      icon: TrendingUp,
      iconCls: 'text-[#06B6D4]',
      iconBg: 'bg-[#06B6D4]/8 border-[#06B6D4]/15',
      delta: 'Total histórico',
      trend: 'up',
    },
  ];

  const statusText = (s: OrderStatus) => ({
    Concluido: t('status_completed'),
    Pendiente: t('status_pending'),
    Cancelado: t('status_cancelled'),
  }[s] ?? s);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── HERO — Greeting Banner ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-200/60 p-7 shadow-premium"
        style={{ background: `linear-gradient(135deg, ${greeting.bgFrom} 0%, white 50%, ${greeting.bgTo} 100%)` }}
      >
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'radial-gradient(#0F4C81 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-5">

            {/* Time-of-day icon */}
            <div className={cn('flex items-center justify-center w-14 h-14 rounded-2xl border-2 shadow-sm shrink-0', greeting.iconBg)}>
              <greeting.Icon size={28} className={greeting.colorCls} strokeWidth={1.5} />
            </div>

            <div>
              {/* Turno badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-slate-200/60 shadow-sm mb-2">
                <Activity size={11} className="text-slate-400" />
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{greeting.badge}</span>
              </div>

              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                {greeting.text}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{t('dash_subtitle')}</p>
            </div>
          </div>

          <Button
            onClick={() => { setActiveOrderForEdit(null); setCurrentView('new-order'); }}
            className="self-start sm:self-auto bg-[#0F4C81] hover:bg-[#0a3a63] shadow-sm hover:shadow-md transition-all shrink-0"
          >
            <PlusCircle size={16} strokeWidth={2} />
            {t('dash_new_order')}
          </Button>
        </div>
      </div>

      {/* ── METRICS ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, iconCls, iconBg, delta, trend }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-premium hover:shadow-premium-lg hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn('p-2.5 rounded-xl border', iconBg)}>
                <Icon size={20} className={iconCls} strokeWidth={2} />
              </div>
              <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-1">{label}</p>
            <div className={cn(
              'inline-flex items-center gap-1 mt-3 text-[10px] font-semibold px-2 py-0.5 rounded-full',
              trend === 'up'   ? 'text-emerald-700 bg-emerald-50' :
              trend === 'warn' ? 'text-amber-700 bg-amber-50' :
                                 'text-slate-500 bg-slate-100'
            )}>
              {delta}
            </div>
          </div>
        ))}
      </div>

      {/* ── RECENT ACTIVITY (Timeline) ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">{t('dash_recent')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('dash_recent_footer')}</p>
          </div>
          <button
            onClick={() => setCurrentView('orders')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0F4C81] hover:text-[#0a3a63] transition-colors group"
          >
            {t('dash_view_all')}
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Timeline list */}
        <div className="divide-y divide-slate-50">
          {recentOrders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <FileClock size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600">{t('ord_no_found')}</p>
              <p className="text-xs text-slate-400 mt-1">Los pedidos aparecerán aquí una vez creados</p>
            </div>
          ) : recentOrders.map((order, idx) => {
            const cfg = statusConfig[order.status];
            const StatusIcon = cfg.icon;
            return (
              <div key={order.id}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
                onClick={() => setCurrentView('orders')}
              >
                {/* Index + status indicator */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center border text-xs font-bold', cfg.cls)}>
                    {idx + 1}
                  </div>
                </div>

                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{order.patientName}</p>
                    {order.codeCID && (
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-[#0F4C81]/8 text-[#0F4C81] text-[10px] font-mono font-bold border border-[#0F4C81]/15">
                        {order.codeCID}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-slate-400">{order.date}</p>
                    <span className="text-slate-200">·</span>
                    <p className="text-xs text-slate-400">
                      {order.exams.length} {order.exams.length === 1 ? t('exam_single') : t('exam_plural')}
                    </p>
                    <span className="text-slate-200">·</span>
                    <p className="text-xs text-slate-400 truncate hidden sm:block">{order.createdBy}</p>
                  </div>
                </div>

                {/* Status badge */}
                <div className="shrink-0 flex items-center gap-2">
                  <div className={cn('hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold', cfg.cls)}>
                    <StatusIcon size={12} />
                    {statusText(order.status)}
                  </div>
                  <Badge variant={getStatusBadgeVariant(order.status)} className="sm:hidden">
                    {statusText(order.status)}
                  </Badge>
                  <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Mostrando los {recentOrders.length} pedidos más recientes de {orders.length} totales
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-slate-400 font-medium">Sistema activo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

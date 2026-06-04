import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { getStatusBadgeVariant } from '../utils/orderUtils';
import { FileClock, Clock, UserCheck, PlusCircle, ArrowRight, TrendingUp, Sun, Sunset, Moon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import type { OrderStatus } from '../types';

// ── Saludo dinámico según hora ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useGreeting(name: string, t: (key: string, opts?: any) => string) {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)  return { text: t('dash_welcome_morning',   { name }), Icon: Sun,    gradient: 'from-amber-400 to-orange-400',   iconCls: 'text-amber-500', ring: 'ring-amber-200',  bg: 'from-amber-50 to-orange-50',   border: 'border-amber-100' };
  if (hour >= 12 && hour < 19) return { text: t('dash_welcome_afternoon', { name }), Icon: Sunset, gradient: 'from-sky-400 to-blue-500',       iconCls: 'text-sky-500',   ring: 'ring-sky-200',    bg: 'from-sky-50 to-blue-50',       border: 'border-sky-100' };
  return                               { text: t('dash_welcome_evening',   { name }), Icon: Moon,   gradient: 'from-indigo-400 to-violet-500',  iconCls: 'text-indigo-500', ring: 'ring-indigo-200', bg: 'from-indigo-50 to-violet-50',  border: 'border-indigo-100' };
}

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { orders, setCurrentView, setActiveOrderForEdit, currentUser } = useApp();

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Nombre corto del doctor: toma la primera palabra después de "Dr." o simplemente el primer nombre
  const doctorShortName = (() => {
    const raw = currentUser?.name ?? '';
    // Si el nombre empieza con Dr./Dra./Dr, quitarlo para el saludo (ya viene en la clave)
    const clean = raw.replace(/^Dr[a]?\.\s*/i, '').trim();
    return clean.split(' ')[0] || raw;
  })();

  const greeting = useGreeting(doctorShortName, t);

  const ordersToday         = orders.filter(o => o.date === todayStr);
  const pendingOrders       = orders.filter(o => o.status === 'Pendiente');
  const uniquePatientsCount = new Set(orders.map(o => o.patientId)).size;
  const recentOrders        = orders.slice(0, 5);

  const statusText = (s: OrderStatus) => ({
    Concluido: t('status_completed'),
    Pendiente: t('status_pending'),
    Cancelado: t('status_cancelled'),
  }[s] ?? s);

  const metrics = [
    { label: t('dash_today_orders'), value: ordersToday.length,       icon: FileClock,  iconCls: 'text-sky-600',    bg: 'bg-sky-100   border border-sky-200' },
    { label: t('dash_pending'),      value: pendingOrders.length,      icon: Clock,      iconCls: 'text-amber-600',  bg: 'bg-amber-100 border border-amber-200' },
    { label: t('dash_attended'),     value: uniquePatientsCount,       icon: UserCheck,  iconCls: 'text-teal-600',   bg: 'bg-teal-100  border border-teal-200' },
    { label: 'Total pedidos',        value: orders.length,             icon: TrendingUp, iconCls: 'text-violet-600', bg: 'bg-violet-100 border border-violet-200' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Greeting header ────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${greeting.bg} ${greeting.border} p-6 shadow-sm`}>
        {/* Orb decorativo */}
        <div className={`absolute -top-8 -right-8 w-40 h-40 rounded-full bg-gradient-to-br ${greeting.gradient} opacity-10 blur-2xl pointer-events-none`} />
        <div className={`absolute bottom-0 left-1/3 w-24 h-24 rounded-full bg-gradient-to-br ${greeting.gradient} opacity-[0.07] blur-xl pointer-events-none`} />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Icono con anillo */}
            <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm ring-4 ${greeting.ring} shrink-0`}>
              <greeting.Icon size={26} className={greeting.iconCls} strokeWidth={1.75} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                {greeting.text}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{t('dash_subtitle')}</p>
            </div>
          </div>

          <Button
            onClick={() => { setActiveOrderForEdit(null); setCurrentView('new-order'); }}
            className="self-start sm:self-auto bg-sky-600 hover:bg-sky-700 shrink-0"
          >
            <PlusCircle size={15} />
            {t('dash_new_order')}
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, iconCls, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
                <p className="text-3xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${bg}`}>
                <Icon size={20} className={iconCls} strokeWidth={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-800">{t('dash_recent')}</h2>
          <button
            onClick={() => setCurrentView('orders')}
            className="flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline transition-colors"
          >
            {t('dash_view_all')}
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[t('pat_col_name'), t('date'), t('print_cid'), t('status'), t('created_by_col', { defaultValue: 'Médico' })].map(h => (
                  <th key={h} className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-400">
                    {t('ord_no_found')}
                  </td>
                </tr>
              ) : recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-sky-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-slate-800">{order.patientName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">ID: {order.patientIdentityCard}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-600 whitespace-nowrap">{order.date}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                      {order.codeCID}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={getStatusBadgeVariant(order.status)}>
                      {statusText(order.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{order.createdBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-200">
          <p className="text-[11px] text-slate-400">{t('dash_recent_footer')}</p>
        </div>
      </div>
    </div>
  );
};

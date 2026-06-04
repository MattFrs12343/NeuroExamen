import type { OrderStatus } from '../types';

// Legacy class-based (kept for backward compat)
export const getStatusBadgeClass = (status: OrderStatus): string => {
  switch (status) {
    case 'Concluido': return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Pendiente': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Cancelado': return 'bg-red-50 text-red-600 border-red-200';
    default:          return 'bg-muted text-muted-foreground border-border';
  }
};

// New shadcn badge variant helper
export const getStatusBadgeVariant = (status: OrderStatus): 'completed' | 'pending' | 'cancelled' | 'muted' => {
  switch (status) {
    case 'Concluido': return 'completed';
    case 'Pendiente': return 'pending';
    case 'Cancelado': return 'cancelled';
    default:          return 'muted';
  }
};

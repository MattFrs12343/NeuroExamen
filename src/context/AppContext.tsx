import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ViewType, User, Patient, Exam, Order, OrderStatus } from '../types';
import { INITIAL_EXAMS } from '../data/seedData';

const EXAMS: Exam[] = INITIAL_EXAMS;
const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost/neuro-api/api';

const getToken = () => localStorage.getItem('neuro_token') || '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

interface AppContextProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  patients: Patient[];
  orders: Order[];
  exams: Exam[];
  loading: boolean;
  selectedOrderForPrint: Order | null;
  setSelectedOrderForPrint: (order: Order | null) => void;
  activeOrderForEdit: Order | null;
  setActiveOrderForEdit: (order: Order | null) => void;
  refreshPatients: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  addOrder: (orderData: {
    patientId: string;
    date: string;
    codeCID: string;
    clinicName?: string;
    observations?: string;
    status: OrderStatus;
    exams: string[];
    examDescriptions?: Record<string, string>;
  }) => Promise<Order>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addPatient: (patientData: Omit<Patient, 'id'>) => Promise<Patient>;
  logout: () => void;
  triggerDirectPrint: (order: Order) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);
  const [activeOrderForEdit, setActiveOrderForEdit] = useState<Order | null>(null);

  // ── Auth error handler ────────────────────────────────────────────────────
  const handleAuthError = useCallback((status: number) => {
    if (status === 401 || status === 403) {
      localStorage.removeItem('neuro_user');
      localStorage.removeItem('neuro_token');
      setCurrentUser(null);
      setPatients([]);
      setOrders([]);
      setCurrentView('login');
      return true;
    }
    return false;
  }, []);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const refreshPatients = useCallback(async () => {
    try {
      const res = await fetch(`${API}/patients`, { headers: authHeaders() });
      if (res.ok) {
        setPatients(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/orders`, { headers: authHeaders() });
      if (res.ok) {
        setOrders(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  // ── Session restore on mount ──────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem('neuro_user');
    const token = getToken();
    if (storedUser && token) {
      fetch(`${API}/auth/me`, { headers: authHeaders() })
        .then(res => {
          if (res.ok) {
            try {
              const user = JSON.parse(storedUser);
              setCurrentUser(user);
              setCurrentView('dashboard');
            } catch {
              localStorage.removeItem('neuro_user');
            }
          } else {
            // Token expirado o inválido — limpiar sesión con mensaje claro
            localStorage.removeItem('neuro_user');
            localStorage.removeItem('neuro_token');
            setCurrentView('login');
            if (res.status === 401 || res.status === 403) {
              // Almacenar flag para mostrar mensaje en el login
              sessionStorage.setItem('session_expired', '1');
            }
          }
        })
        .catch(() => {
          // Servidor offline — restaurar sesión desde localStorage
          try {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
            setCurrentView('dashboard');
          } catch {
            localStorage.removeItem('neuro_user');
          }
        });
    }
  }, []);

  // ── Load data when user logs in ───────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    Promise.all([refreshPatients(), refreshOrders()]).finally(() => setLoading(false));
  }, [currentUser, refreshPatients, refreshOrders]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('neuro_user');
    localStorage.removeItem('neuro_token');
    setCurrentUser(null);
    setPatients([]);
    setOrders([]);
    setCurrentView('login');
  };

  // ── Patients ──────────────────────────────────────────────────────────────
  const addPatient = async (patientData: Omit<Patient, 'id'>): Promise<Patient> => {
    const res = await fetch(`${API}/patients`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(patientData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrar paciente.');
    await refreshPatients();
    return data as Patient;
  };

  // ── Orders ────────────────────────────────────────────────────────────────
  const addOrder = async (orderData: {
    patientId: string;
    date: string;
    codeCID: string;
    clinicName?: string;
    observations?: string;
    status: OrderStatus;
    exams: string[];
    examDescriptions?: Record<string, string>;
  }): Promise<Order> => {
    const res = await fetch(`${API}/orders`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(orderData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrar pedido.');
    await refreshOrders();
    return data as Order;
  };

  const updateOrder = async (updated: Order): Promise<void> => {
    // Send only the fields the backend expects — avoids sending stale/extra fields
    const payload = {
      date: updated.date,
      codeCID: updated.codeCID,
      clinicName: updated.clinicName || null,
      observations: updated.observations || null,
      status: updated.status,
      exams: updated.exams,
      examDescriptions: updated.examDescriptions || null,
      customExams: updated.customExams || null,
    };
    const res = await fetch(`${API}/orders/${updated.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar pedido.');
    await refreshOrders();
  };

  const deleteOrder = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/orders/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar pedido.');
    }
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const triggerDirectPrint = (order: Order) => {
    setSelectedOrderForPrint(order);
    setTimeout(() => window.print(), 150);
  };

  return (
    <AppContext.Provider
      value={{
        currentView, setCurrentView,
        currentUser, setCurrentUser,
        patients, orders,
        exams: EXAMS,
        loading,
        selectedOrderForPrint, setSelectedOrderForPrint,
        activeOrderForEdit, setActiveOrderForEdit,
        refreshPatients, refreshOrders,
        addOrder, updateOrder, deleteOrder,
        addPatient, logout, triggerDirectPrint,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};

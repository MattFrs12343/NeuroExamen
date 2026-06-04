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

// ── Mock orders para visualizar paginación sin backend ────────────────────
const NAMES = [
  'Maria Silva Santos','João Carlos Oliveira','Ana Beatriz Fernandes',
  'Carlos Eduardo Mendes','Luciana Costa Araújo','Roberto Alves Pereira',
  'Fernanda Lima Rodrigues','Paulo Roberto Nascimento','Juliana Moreira Carvalho',
  'Marcos Antônio Vieira','Patrícia Gonçalves Souza','André Luís Barbosa',
  'Camila Dias Ferreira','Ricardo Santos Martins','Vanessa Rocha Lima',
  'Diego Henrique Batista','Cristiane Nunes Pinto','Felipe Augusto Ramos',
  'Simone Teixeira Alves','Bruno César Cavalcanti',
];
const CIDS = ['G40.9','G35','G20','G43.9','G51.0','G47.3','G62.9','G72.9','G80.0','G93.1'];
const STATUSES: OrderStatus[] = ['Concluido','Concluido','Pendiente','Concluido','Cancelado'];
const EXAM_SETS = [['eeg-01'],['pev-01','pev-02'],['enm-sup-01'],['rm-01','rm-03'],['tc-01'],['cog-01','cog-02']];

const MOCK_ORDERS: Order[] = Array.from({ length: 50 }, (_, i) => {
  const d = new Date(2025, 0, 1);
  d.setDate(d.getDate() + i * 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const name  = NAMES[i % NAMES.length];
  return {
    id:                  `MOCK-${String(i + 1).padStart(3, '0')}`,
    patientId:           `mock-pat-${i % NAMES.length}`,
    patientName:         name,
    patientIdentityCard: `${String(100 + i).padStart(3,'0')}.${String(200+i).padStart(3,'0')}.${String(300+i).padStart(3,'0')}-${String(i % 99).padStart(2,'0')}`,
    date:                dateStr,
    codeCID:             CIDS[i % CIDS.length],
    status:              STATUSES[i % STATUSES.length],
    exams:               EXAM_SETS[i % EXAM_SETS.length],
    createdBy:           'Dr. Demo',
  };
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
        const data = await res.json();
        // Si el servidor responde pero sin datos, mostrar mock para visualización
        setOrders(data.length > 0 ? data : MOCK_ORDERS);
      } else {
        handleAuthError(res.status);
        // Si no es error de auth, usar mock
        if (res.status !== 401 && res.status !== 403) setOrders(MOCK_ORDERS);
      }
    } catch {
      // Servidor offline — usar mock para que la UI sea visible
      setOrders(MOCK_ORDERS);
    }
  }, [handleAuthError]);

  // ── Session restore on mount ──────────────────────────────────────────────
  useEffect(() => {
    const storedUser = localStorage.getItem('neuro_user');
    const token = getToken();
    if (storedUser && token) {
      // Validate token against backend before restoring session
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
            // Token expired or invalid — clear session and go to login
            localStorage.removeItem('neuro_user');
            localStorage.removeItem('neuro_token');
            setCurrentView('login');
          }
        })
        .catch(() => {
          // Server offline — restore session optimistically from localStorage
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

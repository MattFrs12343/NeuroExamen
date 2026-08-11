import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ViewType, User, Patient, Exam, Order, OrderStatus, Receta, MedicationLine, ClinicProfile, Encaminhamento } from '../types';
import { INITIAL_EXAMS } from '../data/seedData';
import printCerebroImg from '../assets/print-neurocerebro.webp';
import printMobiusImg from '../assets/print-neuomobius.webp';

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
  recetas: Receta[];
  encaminhamentos: Encaminhamento[];
  exams: Exam[];
  clinics: string[];
  clinicProfiles: ClinicProfile[];
  customExamsCatalog: { id: string; name: string }[];
  medicationsCatalog: { id: string; name: string }[];
  specialistsCatalog: { id: string; name: string }[];
  loading: boolean;
  selectedOrderForPrint: Order | null;
  setSelectedOrderForPrint: (order: Order | null) => void;
  orderPendingPrintSelection: Order | null;
  confirmPrintSelection: (examIds: string[]) => void;
  cancelPrintSelection: () => void;
  activeOrderForEdit: Order | null;
  setActiveOrderForEdit: (order: Order | null) => void;
  activeRecetaForEdit: Receta | null;
  setActiveRecetaForEdit: (receta: Receta | null) => void;
  selectedRecetaForPrint: Receta | null;
  triggerDirectPrintReceta: (receta: Receta) => void;
  recetaPrintCopies: number;
  setRecetaPrintCopies: (n: number) => void;
  activeEncaminhamentoForEdit: Encaminhamento | null;
  setActiveEncaminhamentoForEdit: (encaminhamento: Encaminhamento | null) => void;
  selectedEncaminhamentoForPrint: Encaminhamento | null;
  triggerDirectPrintEncaminhamento: (encaminhamento: Encaminhamento) => void;
  lastClinicName: string;
  setLastClinicName: (name: string) => void;
  refreshPatients: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshRecetas: () => Promise<void>;
  refreshEncaminhamentos: () => Promise<void>;
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
  addReceta: (recetaData: {
    patientId: string;
    date?: string;
    clinicName?: string;
    clinicSecretaria?: string;
    clinicSistema?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicCnpj?: string;
    patientAddress?: string;
    observations?: string;
    medications: MedicationLine[];
  }) => Promise<Receta>;
  updateReceta: (receta: Receta) => Promise<void>;
  deleteReceta: (id: string) => Promise<void>;
  addEncaminhamento: (data: {
    patientId: string;
    date?: string;
    patientAge?: string;
    hd?: string;
    motivo?: string;
    specialists: string[];
  }) => Promise<Encaminhamento>;
  updateEncaminhamento: (encaminhamento: Encaminhamento) => Promise<void>;
  deleteEncaminhamento: (id: string) => Promise<void>;
  addPatient: (patientData: Omit<Patient, 'id'>) => Promise<Patient>;
  addCustomExam: (name: string) => Promise<{ id: string; name: string }>;
  deleteCustomExam: (id: string) => Promise<void>;
  addMedication: (name: string) => Promise<{ id: string; name: string }>;
  deleteMedication: (id: string) => Promise<void>;
  addSpecialist: (name: string) => Promise<{ id: string; name: string }>;
  deleteSpecialist: (id: string) => Promise<void>;
  addClinic: (name: string) => Promise<string>;
  logout: () => void;
  triggerDirectPrint: (order: Order) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([]);
  const [clinics, setClinics] = useState<string[]>([]);
  const [clinicProfiles, setClinicProfiles] = useState<ClinicProfile[]>([]);
  const [customExamsCatalog, setCustomExamsCatalog] = useState<{ id: string; name: string }[]>([]);
  const [medicationsCatalog, setMedicationsCatalog] = useState<{ id: string; name: string }[]>([]);
  const [specialistsCatalog, setSpecialistsCatalog] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<Order | null>(null);
  const [orderPendingPrintSelection, setOrderPendingPrintSelection] = useState<Order | null>(null);
  const [activeOrderForEdit, setActiveOrderForEdit] = useState<Order | null>(null);
  const [activeRecetaForEdit, setActiveRecetaForEdit] = useState<Receta | null>(null);
  const [selectedRecetaForPrint, setSelectedRecetaForPrint] = useState<Receta | null>(null);
  const [recetaPrintCopies, setRecetaPrintCopies] = useState<number>(1);
  const [activeEncaminhamentoForEdit, setActiveEncaminhamentoForEdit] = useState<Encaminhamento | null>(null);
  const [selectedEncaminhamentoForPrint, setSelectedEncaminhamentoForPrint] = useState<Encaminhamento | null>(null);
  const [lastClinicName, setLastClinicNameState] = useState<string>(() => sessionStorage.getItem('neuro_last_clinic') || '');

  const setLastClinicName = (name: string) => {
    setLastClinicNameState(name);
    if (name) sessionStorage.setItem('neuro_last_clinic', name);
    else sessionStorage.removeItem('neuro_last_clinic');
  };

  // ── Auth error handler ────────────────────────────────────────────────────
  const handleAuthError = useCallback((status: number) => {
    if (status === 401 || status === 403) {
      localStorage.removeItem('neuro_user');
      localStorage.removeItem('neuro_token');
      setCurrentUser(null);
      setPatients([]);
      setOrders([]);
      setRecetas([]);
      setEncaminhamentos([]);
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

  const refreshRecetas = useCallback(async () => {
    try {
      const res = await fetch(`${API}/recetas`, { headers: authHeaders() });
      if (res.ok) {
        setRecetas(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshEncaminhamentos = useCallback(async () => {
    try {
      const res = await fetch(`${API}/encaminhamentos`, { headers: authHeaders() });
      if (res.ok) {
        setEncaminhamentos(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshMedicationsCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${API}/medications`, { headers: authHeaders() });
      if (res.ok) {
        setMedicationsCatalog(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshSpecialistsCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${API}/specialists`, { headers: authHeaders() });
      if (res.ok) {
        setSpecialistsCatalog(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshClinics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/clinics`, { headers: authHeaders() });
      if (res.ok) {
        const data: { name: string }[] = await res.json();
        setClinics(data.map(c => c.name));
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshRecetaClinics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/receta-clinics`, { headers: authHeaders() });
      if (res.ok) {
        const data: ClinicProfile[] = await res.json();
        setClinicProfiles(data);
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshCustomExamsCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${API}/custom-exams`, { headers: authHeaders() });
      if (res.ok) {
        setCustomExamsCatalog(await res.json());
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
    Promise.all([
      refreshPatients(), refreshOrders(), refreshRecetas(), refreshEncaminhamentos(),
      refreshClinics(), refreshRecetaClinics(), refreshCustomExamsCatalog(), refreshMedicationsCatalog(), refreshSpecialistsCatalog(),
    ]).finally(() => setLoading(false));
  }, [currentUser, refreshPatients, refreshOrders, refreshRecetas, refreshEncaminhamentos, refreshClinics, refreshRecetaClinics, refreshCustomExamsCatalog, refreshMedicationsCatalog, refreshSpecialistsCatalog]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('neuro_user');
    localStorage.removeItem('neuro_token');
    setCurrentUser(null);
    setPatients([]);
    setOrders([]);
    setRecetas([]);
    setEncaminhamentos([]);
    setCurrentView('login');
    setLastClinicName('');
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

  // ── Custom exams catalog ─────────────────────────────────────────────────
  const addCustomExam = async (name: string): Promise<{ id: string; name: string }> => {
    const res = await fetch(`${API}/custom-exams`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear el estudio personalizado.');
    setCustomExamsCatalog(prev => [...prev, data]);
    return data as { id: string; name: string };
  };

  const deleteCustomExam = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/custom-exams/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar el estudio personalizado.');
    }
    setCustomExamsCatalog(prev => prev.filter(e => e.id !== id));
  };

  // ── Medication catalog ───────────────────────────────────────────────────
  const addMedication = async (name: string): Promise<{ id: string; name: string }> => {
    const res = await fetch(`${API}/medications`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear el medicamento.');
    setMedicationsCatalog(prev => [...prev, data]);
    return data as { id: string; name: string };
  };

  const deleteMedication = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/medications/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar el medicamento.');
    }
    setMedicationsCatalog(prev => prev.filter(m => m.id !== id));
  };

  // ── Specialist catalog ───────────────────────────────────────────────────
  const addSpecialist = async (name: string): Promise<{ id: string; name: string }> => {
    const res = await fetch(`${API}/specialists`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al crear el especialista.');
    setSpecialistsCatalog(prev => [...prev, data]);
    return data as { id: string; name: string };
  };

  const deleteSpecialist = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/specialists/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar el especialista.');
    }
    setSpecialistsCatalog(prev => prev.filter(s => s.id !== id));
  };

  // ── Clinic catalog ────────────────────────────────────────────────────────
  const addClinic = async (name: string): Promise<string> => {
    const res = await fetch(`${API}/clinics`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al agregar la clínica.');
    await refreshClinics();
    return data.name as string;
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

  // ── Recetas ───────────────────────────────────────────────────────────────
  const addReceta = async (recetaData: {
    patientId: string;
    date?: string;
    clinicName?: string;
    clinicSecretaria?: string;
    clinicSistema?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicCnpj?: string;
    patientAddress?: string;
    observations?: string;
    medications: MedicationLine[];
  }): Promise<Receta> => {
    const res = await fetch(`${API}/recetas`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(recetaData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrar receta.');
    await refreshRecetas();
    return data as Receta;
  };

  const updateReceta = async (updated: Receta): Promise<void> => {
    const payload = {
      date: updated.date || null,
      clinicName: updated.clinicName || null,
      clinicSecretaria: updated.clinicSecretaria || null,
      clinicSistema: updated.clinicSistema || null,
      clinicAddress: updated.clinicAddress || null,
      clinicPhone: updated.clinicPhone || null,
      clinicCnpj: updated.clinicCnpj || null,
      patientAddress: updated.patientAddress || null,
      observations: updated.observations || null,
      medications: updated.medications,
    };
    const res = await fetch(`${API}/recetas/${updated.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar receta.');
    await refreshRecetas();
  };

  const deleteReceta = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/recetas/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar receta.');
    }
    setRecetas(prev => prev.filter(r => r.id !== id));
  };

  // ── Encaminhamentos ───────────────────────────────────────────────────────
  const addEncaminhamento = async (data: {
    patientId: string;
    date?: string;
    patientAge?: string;
    hd?: string;
    motivo?: string;
    clinicName?: string;
    specialists: string[];
  }): Promise<Encaminhamento> => {
    const res = await fetch(`${API}/encaminhamentos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Error al registrar encaminhamento.');
    await refreshEncaminhamentos();
    return resData as Encaminhamento;
  };

  const updateEncaminhamento = async (updated: Encaminhamento): Promise<void> => {
    const payload = {
      date: updated.date || null,
      patientAge: updated.patientAge || null,
      hd: updated.hd || null,
      motivo: updated.motivo || null,
      clinicName: updated.clinicName || null,
      specialists: updated.specialists,
    };
    const res = await fetch(`${API}/encaminhamentos/${updated.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar encaminhamento.');
    await refreshEncaminhamentos();
  };

  const deleteEncaminhamento = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/encaminhamentos/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar encaminhamento.');
    }
    setEncaminhamentos(prev => prev.filter(e => e.id !== id));
  };

  // ── Print isolation ──────────────────────────────────────────────────────
  // Cada sección (pedidos, recetas, encaminhamentos) imprime solo su propia
  // plantilla. Además de limpiar el estado de las otras dos, se marca en
  // <body> cuál es el tipo activo (`print-order|receta|encaminhamento`) y el
  // CSS solo revela el `.print-area` correspondiente — así un nodo obsoleto
  // jamás se imprime junto al actual.
  const setActivePrintTarget = (target: 'order' | 'receta' | 'encaminhamento' | null) => {
    const body = document.body;
    body.classList.remove('print-order', 'print-receta', 'print-encaminhamento');
    if (target) body.classList.add(`print-${target}`);
  };

  // Precarga las imágenes del header de impresión para que la vista previa
  // se abra al instante y el logo nunca falte.
  useEffect(() => {
    [printCerebroImg, printMobiusImg].forEach(src => {
      const i = new Image();
      i.src = src;
    });
  }, []);

  // Espera a que React pinte la plantilla y a que sus imágenes terminen de cargar
  // antes de abrir el diálogo de impresión (evita vista previa vacía o sin logo).
  const printAfterRender = () => {
    setTimeout(() => {
      // Solo debe imprimirse una vez: si las imágenes cargan antes del
      // fallback de 2s, hay que cancelarlo — si no, window.print() se
      // dispara dos veces (una al cargar, otra al vencer el timeout) y
      // aparece un segundo diálogo de impresión fantasma.
      let printed = false;
      const printOnce = () => { if (printed) return; printed = true; window.print(); };

      const pending = Array.from(document.querySelectorAll<HTMLImageElement>('.print-area img')).filter(img => !img.complete);
      if (pending.length === 0) { printOnce(); return; }

      let remaining = pending.length;
      const fallback = setTimeout(printOnce, 2000);
      const onDone = () => {
        remaining -= 1;
        if (remaining === 0) { clearTimeout(fallback); printOnce(); }
      };
      pending.forEach(img => {
        img.addEventListener('load', onDone, { once: true });
        img.addEventListener('error', onDone, { once: true });
      });
    }, 150);
  };

  useEffect(() => {
    const clearPrintState = () => {
      setSelectedOrderForPrint(null);
      setSelectedRecetaForPrint(null);
      setSelectedEncaminhamentoForPrint(null);
      setRecetaPrintCopies(1);
      setActivePrintTarget(null);
    };
    window.addEventListener('afterprint', clearPrintState);
    return () => window.removeEventListener('afterprint', clearPrintState);
  }, []);

  const triggerDirectPrintReceta = (receta: Receta) => {
    setSelectedOrderForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setOrderPendingPrintSelection(null);
    setSelectedRecetaForPrint(receta);
    setActivePrintTarget('receta');
    printAfterRender();
  };

  const triggerDirectPrintEncaminhamento = (encaminhamento: Encaminhamento) => {
    setSelectedOrderForPrint(null);
    setSelectedRecetaForPrint(null);
    setOrderPendingPrintSelection(null);
    setSelectedEncaminhamentoForPrint(encaminhamento);
    setActivePrintTarget('encaminhamento');
    printAfterRender();
  };

  const triggerDirectPrint = (order: Order) => {
    setSelectedRecetaForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setOrderPendingPrintSelection(order);
  };

  const confirmPrintSelection = (examIds: string[]) => {
    if (!orderPendingPrintSelection) return;
    setSelectedRecetaForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setSelectedOrderForPrint({ ...orderPendingPrintSelection, exams: examIds });
    setOrderPendingPrintSelection(null);
    setActivePrintTarget('order');
    printAfterRender();
  };

  const cancelPrintSelection = () => setOrderPendingPrintSelection(null);

  return (
    <AppContext.Provider
      value={{
        currentView, setCurrentView,
        currentUser, setCurrentUser,
        patients, orders, recetas, encaminhamentos,
        exams: EXAMS,
        clinics,
        clinicProfiles,
        customExamsCatalog,
        medicationsCatalog,
        specialistsCatalog,
        loading,
        selectedOrderForPrint, setSelectedOrderForPrint,
        orderPendingPrintSelection, confirmPrintSelection, cancelPrintSelection,
        activeOrderForEdit, setActiveOrderForEdit,
        activeRecetaForEdit, setActiveRecetaForEdit,
        selectedRecetaForPrint, triggerDirectPrintReceta,
        recetaPrintCopies, setRecetaPrintCopies,
        activeEncaminhamentoForEdit, setActiveEncaminhamentoForEdit,
        selectedEncaminhamentoForPrint, triggerDirectPrintEncaminhamento,
        lastClinicName, setLastClinicName,
        refreshPatients, refreshOrders, refreshRecetas, refreshEncaminhamentos,
        addOrder, updateOrder, deleteOrder,
        addReceta, updateReceta, deleteReceta,
        addEncaminhamento, updateEncaminhamento, deleteEncaminhamento,
        addPatient, addCustomExam, deleteCustomExam,
        addMedication, deleteMedication,
        addSpecialist, deleteSpecialist,
        addClinic,
        logout, triggerDirectPrint,
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

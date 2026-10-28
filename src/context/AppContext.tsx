import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ViewType, User, Patient, Exam, Order, OrderStatus, OrderPrintMode, Receta, MedicationLine, ClinicProfile, Encaminhamento, Atestado, FormulaLeite, Receituario, Laudo, LaudoClinicProfile, LaudoConclusaoOption } from '../types';
import type { EncProfileKey } from '../data/encaminhamentoProfiles';
import { INITIAL_EXAMS } from '../data/seedData';
import printCerebroImg from '../assets/print-neurocerebro.webp';
import printMobiusImg from '../assets/print-neuomobius.webp';
import { fetchVerificationInfo, uploadAndSignPdf, printPdfBlob } from '../lib/signedPdf';
// capturePrintAreaToPdf se importa dinámicamente en triggerSignAndPrint()
// (ver más abajo): arrastra html2canvas + jsPDF, ~600KB minificados entre
// las dos — cargarlas de entrada metía ese peso en el bundle principal para
// TODOS los usuarios, incluidos los que nunca usan "Assinar e Imprimir".

const EXAMS: Exam[] = INITIAL_EXAMS;
const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost/neuro-api/api';

const getToken = () => localStorage.getItem('neuro_token') || '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

/**
 * Lee el JSON de una respuesta sin romperse si el cuerpo viene vacío.
 *
 * El backend corre con display_errors=Off, así que un error fatal de PHP
 * responde 500 y SIN cuerpo. Con un `await res.json()` a secas, eso producía
 * "Failed to execute 'json' on 'Response': Unexpected end of JSON input",
 * que no dice absolutamente nada. Acá se transforma en un mensaje con el
 * status y la URL, que sí sirve para diagnosticar.
 */
async function readJson<T>(res: Response, what: string): Promise<T> {
  const raw = await res.text();
  if (raw.trim() === '') {
    throw new Error(
      `${what}: el servidor respondió ${res.status} sin contenido ` +
      `(${res.statusText || 'sin motivo'}). Revisá el log de Apache/PHP.`
    );
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Cuerpo no-JSON: normalmente el índice de PHP devolvió HTML, o un
    // warning se imprimió antes del JSON. Se muestra el principio para
    // que se vea qué salió.
    throw new Error(
      `${what}: el servidor respondió ${res.status} con un cuerpo que no es JSON ` +
      `(empieza con "${raw.slice(0, 120)}").`
    );
  }
}

interface AppContextProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  patients: Patient[];
  orders: Order[];
  recetas: Receta[];
  encaminhamentos: Encaminhamento[];
  atestados: Atestado[];
  formulaLeites: FormulaLeite[];
  receituarios: Receituario[];
  laudos: Laudo[];
  laudoClinics: LaudoClinicProfile[];
  exams: Exam[];
  clinics: string[];
  clinicProfiles: ClinicProfile[];
  customExamsCatalog: { id: string; name: string }[];
  /** Opciones administrables de la "Conclusión Pericial" (tabla laudo_conclusoes). */
  laudoConclusoesCatalog: LaudoConclusaoOption[];
  addLaudoConclusao: (label: string) => Promise<LaudoConclusaoOption>;
  renameLaudoConclusao: (id: string, label: string) => Promise<void>;
  deleteLaudoConclusao: (id: string) => Promise<void>;
  medicationsCatalog: { id: string; name: string }[];
  specialistsCatalog: { id: string; name: string; clinicProfile?: string | null }[];
  loading: boolean;
  selectedOrderForPrint: Order | null;
  setSelectedOrderForPrint: (order: Order | null) => void;
  orderPendingPrintSelection: Order | null;
  confirmPrintSelection: (examIds: string[], printMode?: OrderPrintMode) => Promise<void>;
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
  activeAtestadoForEdit: Atestado | null;
  setActiveAtestadoForEdit: (atestado: Atestado | null) => void;
  selectedAtestadoForPrint: Atestado | null;
  triggerDirectPrintAtestado: (atestado: Atestado) => void;
  activeFormulaLeiteForEdit: FormulaLeite | null;
  setActiveFormulaLeiteForEdit: (formulaLeite: FormulaLeite | null) => void;
  selectedFormulaLeiteForPrint: FormulaLeite | null;
  triggerDirectPrintFormulaLeite: (formulaLeite: FormulaLeite) => void;
  selectedReceituarioForPrint: Receituario | null;
  triggerDirectPrintReceituario: (receituario: Receituario) => void;
  activeReceituarioForEdit: Receituario | null;
  setActiveReceituarioForEdit: (receituario: Receituario | null) => void;
  selectedLaudoForPrint: Laudo | null;
  triggerDirectPrintLaudo: (laudo: Laudo) => void;
  activeLaudoForEdit: Laudo | null;
  setActiveLaudoForEdit: (laudo: Laudo | null) => void;
  addReceituario: (data: {
    clinicName?: string;
    clinicSecretaria?: string;
    clinicSistema?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicCnpj?: string;
    patientName?: string;
    patientPhone?: string;
    date?: string;
    content: string;
  }) => Promise<Receituario>;
  updateReceituario: (updated: Receituario) => Promise<void>;
  addLaudo: (data: Omit<Laudo, 'id' | 'createdBy'>) => Promise<Laudo>;
  updateLaudo: (laudo: Laudo) => Promise<void>;
  deleteLaudo: (id: string) => Promise<void>;
  activeEncProfile: EncProfileKey;
  setActiveEncProfile: (profile: EncProfileKey) => void;
  lastClinicName: string;
  setLastClinicName: (name: string) => void;
  refreshPatients: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshRecetas: () => Promise<void>;
  refreshEncaminhamentos: () => Promise<void>;
  refreshAtestados: () => Promise<void>;
  refreshFormulaLeite: () => Promise<void>;
  refreshReceituarios: () => Promise<void>;
  refreshLaudos: () => Promise<void>;
  refreshLaudoClinics: () => Promise<void>;
  saveLaudoClinicProfile: (profile: Partial<LaudoClinicProfile>) => Promise<void>;
  deleteReceituario: (id: string) => Promise<void>;
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
    patientCpf?: string;
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
    clinicName?: string;
    templateId?: string;
    specialists: string[];
  }) => Promise<Encaminhamento>;
  updateEncaminhamento: (encaminhamento: Encaminhamento) => Promise<void>;
  deleteEncaminhamento: (id: string) => Promise<void>;
  addAtestado: (data: Omit<Atestado, 'id' | 'createdBy'>) => Promise<Atestado>;
  updateAtestado: (atestado: Atestado) => Promise<void>;
  deleteAtestado: (id: string) => Promise<void>;
  addFormulaLeite: (data: Omit<FormulaLeite, 'id' | 'createdBy'>) => Promise<FormulaLeite>;
  updateFormulaLeite: (formulaLeite: FormulaLeite) => Promise<void>;
  deleteFormulaLeite: (id: string) => Promise<void>;
  addPatient: (patientData: Omit<Patient, 'id'>) => Promise<Patient>;
  updatePatient: (patient: Patient) => Promise<void>;
  getLastKnownPatientPhone: (patientId: string) => string;
  getLastKnownPatientAddress: (patientId: string) => string;
  addCustomExam: (name: string) => Promise<{ id: string; name: string }>;
  deleteCustomExam: (id: string) => Promise<void>;
  addMedication: (name: string) => Promise<{ id: string; name: string }>;
  deleteMedication: (id: string) => Promise<void>;
  addSpecialist: (name: string, profile?: EncProfileKey) => Promise<{ id: string; name: string }>;
  deleteSpecialist: (id: string) => Promise<void>;
  addClinic: (name: string) => Promise<string>;
  addRecetaClinic: (profile: ClinicProfile) => Promise<string>;
  logout: () => void;
  triggerDirectPrint: (order: Order) => void;
  captureTarget: 'order' | 'receta' | 'encaminhamento' | 'receituario' | null;
  verificationQr: string | null;
  verificationToken: string | null;
  triggerSignAndPrint: (kind: 'order' | 'receta' | 'encaminhamento' | 'receituario', record: Order | Receta | Encaminhamento | Receituario, opts?: { examIds?: string[]; printMode?: OrderPrintMode }) => Promise<void>;
  triggerDownloadPdf: (
    kind: 'order' | 'receta' | 'encaminhamento' | 'atestado' | 'formula-leite',
    record: Order | Receta | Encaminhamento | Atestado | FormulaLeite,
    filename: string
  ) => Promise<void>;
  // A diferencia de captureTarget (se limpia apenas termina la captura
  // html2canvas), signPrintBusy queda activo durante TODO triggerSignAndPrint
  // — incluida la subida y firma en el servidor, que suele ser la parte más
  // lenta — para que el overlay de carga no desaparezca a mitad de camino.
  signPrintBusy: boolean;
  /** Expuesto para que cualquier flujo de "Assinar e imprimir" (hoy Laudos,
      que genera el PDF firmado del lado del servidor con TCPDF sin pasar por
      triggerSignAndPrint) encienda el overlay de pantalla completa mientras
      dura la generación/firma del PDF. */
  setSignPrintBusy: (busy: boolean) => void;
}

// Exportado para el harness de reproducción de impresión (src/dev-print.tsx),
// que provee un valor de contexto mínimo sin pasar por el AppProvider real.
// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [encaminhamentos, setEncaminhamentos] = useState<Encaminhamento[]>([]);
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [formulaLeites, setFormulaLeites] = useState<FormulaLeite[]>([]);
  const [receituarios, setReceituarios] = useState<Receituario[]>([]);
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [clinics, setClinics] = useState<string[]>([]);
  const [clinicProfiles, setClinicProfiles] = useState<ClinicProfile[]>([]);
  const [laudoClinics, setLaudoClinics] = useState<LaudoClinicProfile[]>([]);
  const [customExamsCatalog, setCustomExamsCatalog] = useState<{ id: string; name: string }[]>([]);
  const [laudoConclusoesCatalog, setLaudoConclusoesCatalog] = useState<LaudoConclusaoOption[]>([]);
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
  const [activeAtestadoForEdit, setActiveAtestadoForEdit] = useState<Atestado | null>(null);
  const [selectedAtestadoForPrint, setSelectedAtestadoForPrint] = useState<Atestado | null>(null);
  const [activeFormulaLeiteForEdit, setActiveFormulaLeiteForEdit] = useState<FormulaLeite | null>(null);
  const [selectedFormulaLeiteForPrint, setSelectedFormulaLeiteForPrint] = useState<FormulaLeite | null>(null);
  const [selectedReceituarioForPrint, setSelectedReceituarioForPrint] = useState<Receituario | null>(null);
  const [activeReceituarioForEdit, setActiveReceituarioForEdit] = useState<Receituario | null>(null);
  const [selectedLaudoForPrint, setSelectedLaudoForPrint] = useState<Laudo | null>(null);
  const [activeLaudoForEdit, setActiveLaudoForEdit] = useState<Laudo | null>(null);
  const [captureTarget, setCaptureTarget] = useState<'order' | 'receta' | 'encaminhamento' | 'receituario' | null>(null);
  const [verificationQr, setVerificationQr] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [signPrintBusy, setSignPrintBusy] = useState(false);
  const [activeEncProfile, setActiveEncProfileState] = useState<EncProfileKey>('neuromobius');
  const setActiveEncProfile = useCallback((profile: EncProfileKey) => {
    setActiveEncProfileState(profile);
  }, []);
  const [lastClinicName, setLastClinicNameState] = useState<string>(() => {
    try { return localStorage.getItem('neuro_last_clinic') || ''; } catch { return ''; }
  });

  const setLastClinicName = (name: string) => {
    setLastClinicNameState(name);
    try {
      if (name) localStorage.setItem('neuro_last_clinic', name);
      else localStorage.removeItem('neuro_last_clinic');
    } catch { /* almacenamiento no disponible */ }
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
      setAtestados([]);
      setFormulaLeites([]);
      setLaudos([]);
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

  const refreshAtestados = useCallback(async () => {
    try {
      const res = await fetch(`${API}/atestados`, { headers: authHeaders() });
      if (res.ok) {
        setAtestados(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshFormulaLeite = useCallback(async () => {
    try {
      const res = await fetch(`${API}/formula-leite`, { headers: authHeaders() });
      if (res.ok) {
        setFormulaLeites(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshReceituarios = useCallback(async () => {
    try {
      const res = await fetch(`${API}/receituarios`, { headers: authHeaders() });
      if (res.ok) {
        setReceituarios(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const refreshLaudos = useCallback(async () => {
    try {
      const res = await fetch(`${API}/laudos`, { headers: authHeaders() });
      if (res.ok) {
        setLaudos(await res.json());
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

  const refreshSpecialistsCatalog = useCallback(async (profile?: EncProfileKey) => {
    try {
      const url = profile ? `${API}/specialists?profile=${encodeURIComponent(profile)}` : `${API}/specialists`;
      const res = await fetch(url, { headers: authHeaders() });
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

  const refreshLaudoClinics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/laudo-clinics`, { headers: authHeaders() });
      if (res.ok) {
        setLaudoClinics(await res.json());
      } else {
        handleAuthError(res.status);
      }
    } catch { /* server offline — keep current state */ }
  }, [handleAuthError]);

  const saveLaudoClinicProfile = useCallback(async (profile: Partial<LaudoClinicProfile>) => {
    const res = await fetch(`${API}/laudo-clinics`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        clinicName: profile.name,
        doctorName: profile.doctorName ?? null,
        doctorCrm: profile.doctorCrm ?? null,
        clinicNameFiscal: profile.clinicNameFiscal ?? null,
        clinicAddress: profile.clinicAddress ?? null,
        clinicPhone: profile.clinicPhone ?? null,
        baseInfo: profile.baseInfo ?? null,
        defaultNarrative: profile.defaultNarrative ?? null,
        local: profile.local ?? null,
        logo: profile.logo ?? null,
        primaryColor: profile.primaryColor || '#0F4C81',
        primaryDark: profile.primaryDark || '#0a3a63',
      }),
    });
    const data = await readJson<{ error?: string }>(res, 'No se pudo guardar el perfil de laudo');
    if (!res.ok) throw new Error(data.error || 'Error al guardar el perfil de laudo.');
    await refreshLaudoClinics();
  }, [refreshLaudoClinics]);

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

  // ── Laudo conclusion catalog ──────────────────────────────────────────────
  const refreshLaudoConclusoesCatalog = useCallback(async () => {
    try {
      const res = await fetch(`${API}/laudo-conclusoes`, { headers: authHeaders() });
      if (res.ok) {
        setLaudoConclusoesCatalog(await res.json());
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off an async fetch; loading flag can't be derived at render time
    setLoading(true);
    Promise.all([
      refreshPatients(), refreshOrders(), refreshRecetas(), refreshEncaminhamentos(), refreshAtestados(), refreshFormulaLeite(),
      refreshReceituarios(), refreshLaudos(), refreshClinics(), refreshRecetaClinics(), refreshLaudoClinics(), refreshCustomExamsCatalog(), refreshMedicationsCatalog(), refreshLaudoConclusoesCatalog(),
    ]).finally(() => setLoading(false));
  }, [currentUser, refreshPatients, refreshOrders, refreshRecetas, refreshEncaminhamentos, refreshAtestados, refreshFormulaLeite, refreshReceituarios, refreshLaudos, refreshClinics, refreshRecetaClinics, refreshLaudoClinics, refreshCustomExamsCatalog, refreshMedicationsCatalog, refreshLaudoConclusoesCatalog]);

  // Specialist catalog is scoped per Encaminhamento clinic profile — refetch on profile switch.
  useEffect(() => {
    if (!currentUser) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off an async fetch; loading flag can't be derived at render time
    refreshSpecialistsCatalog(activeEncProfile);
  }, [currentUser, activeEncProfile, refreshSpecialistsCatalog]);

  // Precarga en segundo plano (ociosa, después del login) el chunk de
  // pdfCapture (html2canvas+jsPDF, ~546KB) que "Assinar e Imprimir" importa
  // dinámicamente — sin esto, el primer click de firma paga el costo de
  // red+parseo de ese chunk ANTES de poder empezar a capturar, lo que hace
  // que la firma se sienta mucho más lenta de lo que realmente es. Se
  // dispara en idle time para no competir con la carga inicial de la app;
  // para cuando el médico realmente hace click en firmar, ya está en caché.
  useEffect(() => {
    if (!currentUser) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
    const cancelIdle = window.cancelIdleCallback ?? clearTimeout;
    const handle = idle(() => { void import('../lib/pdfCapture'); });
    return () => cancelIdle(handle);
  }, [currentUser]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('neuro_user');
    localStorage.removeItem('neuro_token');
    setCurrentUser(null);
    setPatients([]);
    setOrders([]);
    setRecetas([]);
    setEncaminhamentos([]);
    setAtestados([]);
    setFormulaLeites([]);
    setLaudos([]);
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

  const updatePatient = async (updated: Patient): Promise<void> => {
    const payload = {
      name: updated.name,
      identityCard: updated.identityCard || null,
      age: updated.age ?? null,
      address: updated.address || null,
    };
    const res = await fetch(`${API}/patients/${updated.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar paciente.');
    await refreshPatients();
    // El nombre del paciente en los historiales (Pedidos, Recetas,
    // Encaminhamentos, Atestados, Fórmula) sale de un JOIN vivo a `patients`,
    // así que al renombrarlo hay que re-consultar esas listas para que la UI
    // muestre el nombre nuevo sin necesidad de recargar la app.
    await Promise.all([
      refreshOrders(), refreshRecetas(), refreshEncaminhamentos(), refreshAtestados(), refreshFormulaLeite(), refreshLaudos(),
    ]);
  };

  // ── Datos de contacto "última vez conocidos" — cross-módulo ────────────
  // El teléfono/dirección del paciente se guarda POR DOCUMENTO (no en el
  // registro maestro de Patient — así lo pidió el usuario, para poder
  // editarlo por sección sin afectar otras). Sin esto, un teléfono cargado
  // en un Pedido no aparecía al crear después una Receta para el mismo
  // paciente, aunque sea la misma persona — cada sección buscaba (cuando
  // buscaba) solo en sus propios registros anteriores. Acá se busca en
  // TODOS los módulos y se usa el primero que tenga el dato, sin intentar
  // ordenar por fecha "real" entre módulos (Atestados guarda la fecha como
  // texto libre tipo "23/07/2026", no comparable con el YYYY-MM-DD de los
  // demás) — dentro de cada módulo sí se usa el más reciente.
  const mostRecentWith = <T extends { patientId: string }>(list: T[], patientId: string, field: keyof T, dateField: keyof T): string => {
    const matches = list.filter(x => x.patientId === patientId && x[field]);
    if (!matches.length) return '';
    return String(matches.sort((a, b) => String(b[dateField] || '').localeCompare(String(a[dateField] || '')))[0][field]);
  };

  const getLastKnownPatientPhone = useCallback((patientId: string): string => {
    return mostRecentWith(formulaLeites, patientId, 'patientPhone', 'firstConsultDate')
        || mostRecentWith(atestados, patientId, 'patientPhone', 'issuedAt')
        || mostRecentWith(encaminhamentos, patientId, 'patientPhone', 'date')
        || mostRecentWith(recetas, patientId, 'patientPhone', 'date')
        || mostRecentWith(orders, patientId, 'patientPhone', 'date');
  }, [orders, recetas, encaminhamentos, atestados, formulaLeites]);

  const getLastKnownPatientAddress = useCallback((patientId: string): string => {
    return mostRecentWith(atestados, patientId, 'patientAddress', 'issuedAt')
        || mostRecentWith(recetas, patientId, 'patientAddress', 'date');
  }, [recetas, atestados]);

  // ── Laudo "Conclusão Pericial" catalog ────────────────────────────────────
  // Catálogo global administrable: el médico agrega, edita el texto y elimina
  // opciones. Lo que ya está firmado no se toca — cada laudo guarda su propio
  // snapshot de la lista (Laudo.conclusaoOpcoes).
  const addLaudoConclusao = async (label: string): Promise<LaudoConclusaoOption> => {
    const res = await fetch(`${API}/laudo-conclusoes`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ label }),
    });
    const data = await readJson<{ error?: string }>(res, 'No se pudo crear la conclusão');
    if (!res.ok) throw new Error(data.error || 'Error al crear la conclusão.');
    setLaudoConclusoesCatalog(prev => [...prev, data as LaudoConclusaoOption]);
    return data as LaudoConclusaoOption;
  };

  /** Cambia el texto de una opción. El ID no cambia, así que los laudos que la tenían elegida siguen apuntando a la misma opción. */
  const renameLaudoConclusao = async (id: string, label: string): Promise<void> => {
    const res = await fetch(`${API}/laudo-conclusoes/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ label }),
    });
    const data = await readJson<{ error?: string }>(res, 'No se pudo editar la conclusão');
    if (!res.ok) throw new Error(data.error || 'Error al editar la conclusão.');
    setLaudoConclusoesCatalog(prev => prev.map(o => o.id === id ? { ...o, label } : o));
  };

  /**
   * Saca la opción del catálogo. Solo afecta a los laudos futuros: los ya
   * firmados conservan su texto porque llevan el snapshot guardado.
   */
  const deleteLaudoConclusao = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/laudo-conclusoes/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await readJson<{ error?: string }>(res, 'No se pudo eliminar la conclusión');
    if (!res.ok) throw new Error(data.error || 'Error al eliminar la conclusão.');
    setLaudoConclusoesCatalog(prev => prev.filter(o => o.id !== id));
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
  const addSpecialist = async (name: string, profile?: EncProfileKey): Promise<{ id: string; name: string }> => {
    const res = await fetch(`${API}/specialists`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name, profile }),
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

  // ── Receta clinics catalog (perfil completo: Recetas + Atestados) ──────────
  const addRecetaClinic = async (profile: ClinicProfile): Promise<string> => {
    const res = await fetch(`${API}/receta-clinics`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(profile),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al agregar la clínica.');
    await refreshRecetaClinics();
    return data.name as string;
  };

  // ── Orders ────────────────────────────────────────────────────────────────
  const addOrder = async (orderData: {
    patientId: string;
    date: string;
    codeCID: string;
    patientPhone?: string;
    clinicName?: string;
    clinicSecretaria?: string;
    clinicSistema?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicCnpj?: string;
    observations?: string;
    status: OrderStatus;
    exams: string[];
    examDescriptions?: Record<string, string>;
    customExams?: Record<string, { id: string; name: string; category: string; categoryTitle?: string }>;
    printMode?: OrderPrintMode;
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
      clinicSecretaria: updated.clinicSecretaria || null,
      clinicSistema: updated.clinicSistema || null,
      clinicAddress: updated.clinicAddress || null,
      clinicPhone: updated.clinicPhone || null,
      clinicCnpj: updated.clinicCnpj || null,
      observations: updated.observations || null,
      status: updated.status,
      exams: updated.exams,
      examDescriptions: updated.examDescriptions || null,
      customExams: updated.customExams || null,
      patientPhone: updated.patientPhone || null,
      printMode: updated.printMode || null,
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
    patientCpf?: string;
    patientPhone?: string;
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
      patientCpf: updated.patientCpf || null,
      observations: updated.observations || null,
      medications: updated.medications,
      patientPhone: updated.patientPhone || null,
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
    patientPhone?: string;
    hd?: string;
    motivo?: string;
    clinicName?: string;
    clinicSecretaria?: string;
    clinicSistema?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicCnpj?: string;
    templateId?: string;
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
      clinicSecretaria: updated.clinicSecretaria || null,
      clinicSistema: updated.clinicSistema || null,
      clinicAddress: updated.clinicAddress || null,
      clinicPhone: updated.clinicPhone || null,
      clinicCnpj: updated.clinicCnpj || null,
      templateId: updated.templateId || 'neuromobius',
      specialists: updated.specialists,
      patientPhone: updated.patientPhone || null,
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

  // ── Atestados ─────────────────────────────────────────────────────────────
  const addAtestado = async (data: Omit<Atestado, 'id' | 'createdBy'>): Promise<Atestado> => {
    const res = await fetch(`${API}/atestados`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Error al registrar atestado.');
    await refreshAtestados();
    return resData as Atestado;
  };

  const updateAtestado = async (updated: Atestado): Promise<void> => {
    const payload: Record<string, unknown> = { ...updated };
    delete payload.id;
    delete payload.createdBy;
    const res = await fetch(`${API}/atestados/${updated.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar atestado.');
    await refreshAtestados();
  };

  const deleteAtestado = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/atestados/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar atestado.');
    }
    setAtestados(prev => prev.filter(a => a.id !== id));
  };

  // ── Fórmulas Infantis Especiais (ficha CNES/leite) ──────────────────────────
  const addFormulaLeite = async (data: Omit<FormulaLeite, 'id' | 'createdBy'>): Promise<FormulaLeite> => {
    const res = await fetch(`${API}/formula-leite`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Error al registrar la ficha.');
    await refreshFormulaLeite();
    return resData as FormulaLeite;
  };

  const updateFormulaLeite = async (updated: FormulaLeite): Promise<void> => {
    const payload: Record<string, unknown> = { ...updated };
    delete payload.id;
    delete payload.createdBy;
    const res = await fetch(`${API}/formula-leite/${updated.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar la ficha.');
    await refreshFormulaLeite();
  };

  const deleteFormulaLeite = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/formula-leite/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar la ficha.');
    }
    setFormulaLeites(prev => prev.filter(f => f.id !== id));
  };

  // ── Receituário ──────────────────────────────────────────────────────────
  const addReceituario = async (data: {
    clinicName?: string;
    clinicSecretaria?: string;
    clinicSistema?: string;
    clinicAddress?: string;
    clinicPhone?: string;
    clinicCnpj?: string;
    patientName?: string;
    patientPhone?: string;
    date?: string;
    content: string;
  }): Promise<Receituario> => {
    const res = await fetch(`${API}/receituarios`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || 'Error al registrar receituário.');
    await refreshReceituarios();
    return resData as Receituario;
  };

  const updateReceituario = async (updated: Receituario): Promise<void> => {
    const payload = {
      clinicName: updated.clinicName || null,
      clinicSecretaria: updated.clinicSecretaria || null,
      clinicSistema: updated.clinicSistema || null,
      clinicAddress: updated.clinicAddress || null,
      clinicPhone: updated.clinicPhone || null,
      clinicCnpj: updated.clinicCnpj || null,
      patientName: updated.patientName || null,
      patientPhone: updated.patientPhone || null,
      date: updated.date || null,
      content: updated.content,
    };
    const res = await fetch(`${API}/receituarios/${updated.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al actualizar receituário.');
    await refreshReceituarios();
  };

  const deleteReceituario = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/receituarios/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar receituário.');
    }
    setReceituarios(prev => prev.filter(r => r.id !== id));
  };

  // ── Laudos (Laudo Pericial Médico por clínica) ───────────────────────────
  const addLaudo = async (data: Omit<Laudo, 'id' | 'createdBy'>): Promise<Laudo> => {
    const res = await fetch(`${API}/laudos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const resData = await readJson<{ error?: string }>(res, 'No se pudo guardar el laudo');
    if (!res.ok) throw new Error(resData.error || 'Error al registrar laudo.');
    await refreshLaudos();
    return resData as Laudo;
  };

  const updateLaudo = async (updated: Laudo): Promise<void> => {
    const payload: Record<string, unknown> = { ...updated };
    delete payload.id;
    delete payload.createdBy;
    const res = await fetch(`${API}/laudos/${updated.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await readJson<{ error?: string }>(res, 'No se pudo actualizar el laudo');
    if (!res.ok) throw new Error(data.error || 'Error al actualizar laudo.');
    await refreshLaudos();
  };

  const deleteLaudo = async (id: string): Promise<void> => {
    const res = await fetch(`${API}/laudos/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al eliminar laudo.');
    }
    setLaudos(prev => prev.filter(l => l.id !== id));
  };

  // ── Print isolation ──────────────────────────────────────────────────────
  // Cada sección (pedidos, recetas, encaminhamentos, atestados, fórmulas
  // infantis) imprime solo su propia plantilla. Además de limpiar el estado
  // de las otras, se marca en <body> cuál es el tipo activo
  // (`print-order|receta|encaminhamento|atestado|formula-leite`) y el CSS
  // solo revela el `.print-area` correspondiente — así un nodo obsoleto
  // jamás se imprime junto al actual.
  const setActivePrintTarget = (target: 'order' | 'receta' | 'encaminhamento' | 'atestado' | 'formula-leite' | 'receituario' | 'laudo' | null) => {
    const body = document.body;
    body.classList.remove('print-order', 'print-receta', 'print-encaminhamento', 'print-atestado', 'print-formula-leite', 'print-receituario', 'print-laudo');
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

  // Espera a que React pinte la plantilla y a que sus imágenes terminen de
  // cargar — usado tanto por printAfterRender() (dispara window.print())
  // como por triggerSignAndPrint() (dispara una captura html2canvas en vez
  // de imprimir), que necesitan exactamente la misma espera.
  const waitForPrintAreaReady = (): Promise<void> => new Promise(resolve => {
    setTimeout(() => {
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };

      const pending = Array.from(document.querySelectorAll<HTMLImageElement>('.print-area img')).filter(img => !img.complete);
      if (pending.length === 0) { finish(); return; }

      let remaining = pending.length;
      const fallback = setTimeout(finish, 2000);
      const onDone = () => {
        remaining -= 1;
        if (remaining === 0) { clearTimeout(fallback); finish(); }
      };
      pending.forEach(img => {
        img.addEventListener('load', onDone, { once: true });
        img.addEventListener('error', onDone, { once: true });
      });
    }, 150);
  });

  // Espera a que React pinte la plantilla y a que sus imágenes terminen de cargar
  // antes de abrir el diálogo de impresión (evita vista previa vacía o sin logo).
  const printAfterRender = () => {
    void waitForPrintAreaReady().then(() => window.print());
  };

  useEffect(() => {
    const clearPrintState = () => {
      setSelectedOrderForPrint(null);
      setSelectedRecetaForPrint(null);
      setSelectedEncaminhamentoForPrint(null);
      setSelectedAtestadoForPrint(null);
      setSelectedFormulaLeiteForPrint(null);
      setSelectedReceituarioForPrint(null);
      setSelectedLaudoForPrint(null);
      setRecetaPrintCopies(1);
      setActivePrintTarget(null);
    };
    window.addEventListener('afterprint', clearPrintState);
    return () => window.removeEventListener('afterprint', clearPrintState);
  }, []);

  const triggerDirectPrintReceta = (receta: Receta) => {
    setSelectedOrderForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setSelectedAtestadoForPrint(null);
    setSelectedFormulaLeiteForPrint(null);
    setSelectedReceituarioForPrint(null);
    setOrderPendingPrintSelection(null);
    setSelectedRecetaForPrint(receta);
    setActivePrintTarget('receta');
    printAfterRender();
  };

  const triggerDirectPrintEncaminhamento = (encaminhamento: Encaminhamento) => {
    setSelectedOrderForPrint(null);
    setSelectedRecetaForPrint(null);
    setSelectedAtestadoForPrint(null);
    setSelectedFormulaLeiteForPrint(null);
    setSelectedReceituarioForPrint(null);
    setOrderPendingPrintSelection(null);
    setSelectedEncaminhamentoForPrint(encaminhamento);
    setActivePrintTarget('encaminhamento');
    printAfterRender();
  };

  const triggerDirectPrintAtestado = (atestado: Atestado) => {
    setSelectedOrderForPrint(null);
    setSelectedRecetaForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setSelectedFormulaLeiteForPrint(null);
    setSelectedReceituarioForPrint(null);
    setOrderPendingPrintSelection(null);
    setSelectedAtestadoForPrint(atestado);
    setActivePrintTarget('atestado');
    printAfterRender();
  };

  const triggerDirectPrintFormulaLeite = (formulaLeite: FormulaLeite) => {
    setSelectedOrderForPrint(null);
    setSelectedRecetaForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setSelectedAtestadoForPrint(null);
    setSelectedReceituarioForPrint(null);
    setOrderPendingPrintSelection(null);
    setSelectedFormulaLeiteForPrint(formulaLeite);
    setActivePrintTarget('formula-leite');
    printAfterRender();
  };

  const triggerDirectPrintReceituario = (receituario: Receituario) => {
    setSelectedOrderForPrint(null);
    setSelectedRecetaForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setSelectedAtestadoForPrint(null);
    setSelectedFormulaLeiteForPrint(null);
    setSelectedLaudoForPrint(null);
    setOrderPendingPrintSelection(null);
    setSelectedReceituarioForPrint(receituario);
    setActivePrintTarget('receituario');
    printAfterRender();
  };

  const triggerDirectPrintLaudo = (laudo: Laudo) => {
    setSelectedOrderForPrint(null);
    setSelectedRecetaForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setSelectedAtestadoForPrint(null);
    setSelectedFormulaLeiteForPrint(null);
    setSelectedReceituarioForPrint(null);
    setOrderPendingPrintSelection(null);
    setSelectedLaudoForPrint(laudo);
    setActivePrintTarget('laudo');
    printAfterRender();
  };

  const triggerDirectPrint = (order: Order) => {
    setSelectedRecetaForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setSelectedAtestadoForPrint(null);
    setSelectedFormulaLeiteForPrint(null);
    setSelectedReceituarioForPrint(null);
    setSelectedLaudoForPrint(null);
    setOrderPendingPrintSelection(order);
  };

  const confirmPrintSelection = async (examIds: string[], printMode?: OrderPrintMode) => {
    const pending = orderPendingPrintSelection;
    if (!pending) return;

    const mode: OrderPrintMode = printMode ?? pending.printMode ?? 'both';

    setSelectedRecetaForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setSelectedAtestadoForPrint(null);
    setSelectedFormulaLeiteForPrint(null);
    setSelectedReceituarioForPrint(null);
    setSelectedLaudoForPrint(null);
    setOrderPendingPrintSelection(null);

    // Persistir la elección para que las próximas reimpresiones la respeten.
    // No bloquea la impresión si falla: el PDF de esta vez ya la recibe.
    if (mode !== (pending.printMode ?? 'both')) {
      try { await updateOrder({ ...pending, printMode: mode }); }
      catch { /* la impresión no depende de que se guarde el modo */ }
    }

    setSelectedOrderForPrint({ ...pending, exams: examIds, printMode: mode });
    setActivePrintTarget('order');
    printAfterRender();
  };

  const cancelPrintSelection = () => setOrderPendingPrintSelection(null);

  // Descarga un PDF SIN firmar (sin llamar al servidor) de cualquiera de
  // los 5 documentos, capturando la plantilla real de impresión con
  // html2canvas — mismo mecanismo que triggerSignAndPrint(), pero sin el
  // paso de subir/firmar en el servidor: solo captura y descarga. Usado
  // por el botón "Enviar por WhatsApp" (ver New*.tsx): como wa.me no puede
  // adjuntar archivos automáticamente a un chat, se descarga el PDF a la
  // vez que se abre WhatsApp, para que el médico lo adjunte a mano.
  const triggerDownloadPdf = async (
    kind: 'order' | 'receta' | 'encaminhamento' | 'atestado' | 'formula-leite',
    record: Order | Receta | Encaminhamento | Atestado | FormulaLeite,
    filename: string
  ): Promise<void> => {
    setSelectedOrderForPrint(null);
    setSelectedRecetaForPrint(null);
    setSelectedEncaminhamentoForPrint(null);
    setSelectedAtestadoForPrint(null);
    setSelectedFormulaLeiteForPrint(null);
    setSelectedLaudoForPrint(null);
    setOrderPendingPrintSelection(null);

    if (kind === 'order') {
      setSelectedOrderForPrint(record as Order);
    } else if (kind === 'receta') {
      setRecetaPrintCopies(1);
      setSelectedRecetaForPrint(record as Receta);
    } else if (kind === 'encaminhamento') {
      setSelectedEncaminhamentoForPrint(record as Encaminhamento);
    } else if (kind === 'atestado') {
      setSelectedAtestadoForPrint(record as Atestado);
    } else {
      setSelectedFormulaLeiteForPrint(record as FormulaLeite);
    }

    document.body.classList.add(`capturing-${kind}`);
    try {
      await waitForPrintAreaReady();
      const { capturePrintAreaToPdf } = await import('../lib/pdfCapture');
      const { blob } = await capturePrintAreaToPdf(kind);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } finally {
      document.body.classList.remove(`capturing-${kind}`);
      setSelectedOrderForPrint(null);
      setSelectedRecetaForPrint(null);
      setSelectedEncaminhamentoForPrint(null);
      setSelectedAtestadoForPrint(null);
      setSelectedFormulaLeiteForPrint(null);
    }
  };

  // Pedidos y Recetas firman capturando la plantilla REAL de impresión con
  // html2canvas (en vez de reconstruir el diseño del lado del servidor con
  // TCPDF — ver src/lib/pdfCapture.ts y server-php/lib/signing.php para el
  // porqué). Selecciona el registro igual que triggerDirectPrint*/
  // confirmPrintSelection, pide el token de verificación (para el QR que
  // dibuja la propia plantilla), revela la plantilla fuera de pantalla
  // (`capturing-{kind}`), captura, y recién ahí sube el PDF para firmar.
  const triggerSignAndPrint = async (
    kind: 'order' | 'receta' | 'encaminhamento' | 'receituario',
    record: Order | Receta | Encaminhamento | Receituario,
    opts?: { examIds?: string[]; printMode?: OrderPrintMode }
  ): Promise<void> => {
    // Todo el cuerpo (no solo la parte de red/captura) va dentro de este
    // try/finally: signPrintBusy tiene que resetearse pase lo que pase, para
    // que un throw temprano (antes de llegar al try interno de abajo) no
    // deje el overlay de "Firmando documento…" trabado para siempre
    // tapando toda la app (bug real: bloqueaba hasta el botón de firmar).
    if (signPrintBusy) return;
    setSignPrintBusy(true);
    try {
      setSelectedAtestadoForPrint(null);
      setSelectedFormulaLeiteForPrint(null);
      setOrderPendingPrintSelection(null);

      if (kind === 'order') {
        setSelectedRecetaForPrint(null);
        setSelectedEncaminhamentoForPrint(null);
        setSelectedReceituarioForPrint(null);
        const order = record as Order;
        setSelectedOrderForPrint({
          ...order,
          exams: opts?.examIds ?? order.exams,
          printMode: opts?.printMode ?? order.printMode ?? 'both',
        });
      } else if (kind === 'receta') {
        setSelectedOrderForPrint(null);
        setSelectedEncaminhamentoForPrint(null);
        setSelectedReceituarioForPrint(null);
        // recetaPrintCopies NO se toca acá: respeta lo que haya puesto el
        // llamador (el checkbox "imprimir 2 vías" de NewReceta.tsx antes de
        // llamar a esta función, o el valor por defecto 1 si viene del
        // listado, que no expone ese checkbox).
        setSelectedRecetaForPrint(record as Receta);
      } else if (kind === 'encaminhamento') {
        setSelectedOrderForPrint(null);
        setSelectedRecetaForPrint(null);
        setSelectedReceituarioForPrint(null);
        setSelectedEncaminhamentoForPrint(record as Encaminhamento);
      } else {
        setSelectedOrderForPrint(null);
        setSelectedRecetaForPrint(null);
        setSelectedEncaminhamentoForPrint(null);
        setSelectedReceituarioForPrint(record as Receituario);
      }
      setCaptureTarget(kind);

      const apiKind = kind === 'order' ? 'orders' : kind === 'receta' ? 'recetas' : kind === 'encaminhamento' ? 'encaminhamentos' : 'receituarios';

      try {
        // Se dispara en paralelo con fetchVerificationInfo/waitForPrintAreaReady
        // (en vez de esperar a este punto) para que la descarga del chunk
        // (html2canvas + jsPDF) se solape con esa espera de red en vez de
        // sumarse como latencia extra recién acá.
        const pdfCaptureModule = import('../lib/pdfCapture');

        const { token, qrContent } = await fetchVerificationInfo(apiKind, record.id);
        setVerificationQr(qrContent);
        setVerificationToken(token);

        document.body.classList.add(`capturing-${kind}`);
        await waitForPrintAreaReady();

        const { capturePrintAreaToPdf } = await pdfCaptureModule;
        let captured: { blob: Blob; pageHeightsMm: number[] };
        try {
          captured = await capturePrintAreaToPdf(kind);
        } finally {
          document.body.classList.remove(`capturing-${kind}`);
          setVerificationQr(null);
          setVerificationToken(null);
          setCaptureTarget(null);
        }

        const signQuery: Record<string, string> = {
          contentHeights: captured.pageHeightsMm.map(h => h.toFixed(1)).join(','),
        };
        // El servidor necesita la lista ORDENADA de exámenes del pedido para
        // saber dónde intercalar los documentos especiales (Dinamômetro/
        // Estesiômetro/Equilíbrio, generados de cero con TCPDF) entre las
        // páginas capturadas de los demás exámenes — ver api/orders/signed-pdf.php.
        if (kind === 'order') {
          signQuery.examIds = (opts?.examIds ?? (record as Order).exams).join(',');
          signQuery.printMode = opts?.printMode ?? (record as Order).printMode ?? 'both';
        }
        const signedBlob = await uploadAndSignPdf(apiKind, record.id, captured.blob, signQuery);
        await printPdfBlob(signedBlob);
      } finally {
        setSelectedOrderForPrint(null);
        setSelectedRecetaForPrint(null);
        setSelectedEncaminhamentoForPrint(null);
        setSelectedReceituarioForPrint(null);
        setCaptureTarget(null);
        setVerificationQr(null);
        setVerificationToken(null);
        document.body.classList.remove('capturing-order', 'capturing-receta', 'capturing-encaminhamento', 'capturing-receituario');
      }
    } finally {
      setSignPrintBusy(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentView, setCurrentView,
        currentUser, setCurrentUser,
        patients, orders, recetas, encaminhamentos, atestados, formulaLeites, receituarios, laudos,
        exams: EXAMS,
        clinics,
        clinicProfiles,
        laudoClinics,
        customExamsCatalog,
        laudoConclusoesCatalog,
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
        activeAtestadoForEdit, setActiveAtestadoForEdit,
        selectedAtestadoForPrint, triggerDirectPrintAtestado,
        activeFormulaLeiteForEdit, setActiveFormulaLeiteForEdit,
        selectedFormulaLeiteForPrint, triggerDirectPrintFormulaLeite,
        selectedReceituarioForPrint, triggerDirectPrintReceituario,
        activeReceituarioForEdit, setActiveReceituarioForEdit,
        selectedLaudoForPrint, triggerDirectPrintLaudo,
        activeLaudoForEdit, setActiveLaudoForEdit,
        addReceituario, updateReceituario, deleteReceituario,
        addLaudo, updateLaudo, deleteLaudo,
        activeEncProfile, setActiveEncProfile,
        lastClinicName, setLastClinicName,
refreshPatients, refreshOrders, refreshRecetas, refreshEncaminhamentos, refreshAtestados, refreshFormulaLeite, refreshReceituarios, refreshLaudos, refreshLaudoClinics,
        addOrder, updateOrder, deleteOrder,
        addReceta, updateReceta, deleteReceta,
        addEncaminhamento, updateEncaminhamento, deleteEncaminhamento,
        addAtestado, updateAtestado, deleteAtestado,
        addFormulaLeite, updateFormulaLeite, deleteFormulaLeite,
        addPatient, updatePatient, getLastKnownPatientPhone, getLastKnownPatientAddress, addCustomExam, deleteCustomExam,
        addLaudoConclusao, renameLaudoConclusao, deleteLaudoConclusao,
        addMedication, deleteMedication,
        addSpecialist, deleteSpecialist,
        addClinic, addRecetaClinic, saveLaudoClinicProfile,
        logout, triggerDirectPrint,
        captureTarget, verificationQr, verificationToken, triggerSignAndPrint, signPrintBusy, setSignPrintBusy,
        triggerDownloadPdf,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- hook is colocated with its provider by design
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};

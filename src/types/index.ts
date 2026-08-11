export type ViewType = 'login' | 'dashboard' | 'orders' | 'new-order' | 'profile' | 'patients' | 'recetas' | 'new-receta' | 'encaminhamentos' | 'new-encaminhamento';

export interface User {
  id: string;
  name: string;
  email: string;
  specialty: string;
  crmLicense?: string;
  rqeSpecialty?: string;
  registrationDate: string;
}

export interface Patient {
  id: string;
  name: string;
  identityCard: string;
  age?: number;
}

export interface Exam {
  id: string;
  category: string;
  name: string;
  /** Oculto para nuevos pedidos, pero se sigue resolviendo en pedidos ya existentes que lo referencian. */
  hidden?: boolean;
}

export type OrderStatus = 'Pendiente' | 'Concluido' | 'Cancelado';

export interface Order {
  id: string;
  patientId: string;
  patientName: string;
  patientIdentityCard: string;
  date: string; // YYYY-MM-DD
  codeCID: string;
  clinicName?: string;
  observations?: string;
  status: OrderStatus;
  exams: string[];
  examDescriptions?: Record<string, string>;
  customExams?: Record<string, { id: string; name: string; category: string; categoryTitle?: string }>;
  createdBy: string;
}

export interface ClinicProfile {
  name: string;
  secretaria?: string;
  sistema?: string;
  address?: string;
  phone?: string;
  cnpj?: string;
}

export interface MedicationLine {
  id: string;
  text: string;
}

export interface Receta {
  id: string;
  patientId: string;
  patientName: string;
  patientIdentityCard: string;
  date?: string; // YYYY-MM-DD — opcional, la receta puede imprimirse sin fecha
  clinicName?: string;
  clinicSecretaria?: string;
  clinicSistema?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicCnpj?: string;
  patientAddress?: string;
  observations?: string;
  medications: MedicationLine[];
  createdBy: string;
}

export interface Encaminhamento {
  id: string;
  patientId: string;
  patientName: string;
  patientIdentityCard: string;
  date?: string; // YYYY-MM-DD — opcional
  patientAge?: string;
  hd?: string;
  motivo?: string;
  clinicName?: string;
  specialists: string[]; // ids del catálogo specialist_catalog
  createdBy: string;
}

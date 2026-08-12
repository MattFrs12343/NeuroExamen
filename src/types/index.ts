export type ViewType = 'login' | 'dashboard' | 'orders' | 'new-order' | 'profile' | 'patients' | 'recetas' | 'new-receta' | 'encaminhamentos' | 'new-encaminhamento' | 'atestados' | 'new-atestado';

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
  /** CPF/DNI. Opcional: un paciente puede registrarse sin documento. */
  identityCard?: string;
  age?: number;
  /** Clínica de origen en Encaminhamentos (neuromobius | neuroisbe); NULL = NEUROMOBIUS. */
  origin?: string;
  /** Endereço — se precarga en próximas recetas/documentos del mismo paciente. */
  address?: string;
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
  patientIdentityCard?: string;
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
  patientIdentityCard?: string;
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
  patientIdentityCard?: string;
  date?: string; // YYYY-MM-DD — opcional
  patientAge?: string;
  hd?: string;
  motivo?: string;
  clinicName?: string;
  /** Perfil de documento/impresión usado al crearlo (neuromobius | neuroisbe). */
  templateId?: 'neuromobius' | 'neuroisbe';
  specialists: string[]; // ids del catálogo specialist_catalog
  createdBy: string;
}

export interface Atestado {
  id: string;
  patientId: string;
  patientName: string;
  /** CPF del paciente (misma fuente que patientIdentityCard). Opcional. */
  patientIdentityCard?: string;
  /** Nascimento — se guarda como string libre (ej: 08/05/1997). */
  patientBirthDate?: string;
  /** Endereço completo del paciente. */
  patientAddress?: string;
  /** Emissão — fecha y hora del documento (ej: 23/07/2026 - 10:51:28). */
  issuedAt?: string;
  /** Token de validación (ej: MMOP4TW). */
  token?: string;
  /** Código de acceso de validación (ej: 3323). */
  accessCode?: string;
  /** Sitio de validación (ej: https://validar.iti.gov.br). */
  validationUrl?: string;
  /** Contenido del código QR. */
  qrContent?: string;
  /** Código CID (ej: F41.1). */
  cid?: string;
  /** Hora de inicio de la atención (ej: 10h20). */
  careStartTime?: string;
  /** Hora de finalización de la atención (ej: 10h45). */
  careEndTime?: string;
  /** Fecha del atestado — string libre (ej: 23/07/2026). */
  careDate?: string;
  /** Cantidad de días de reposo (ej: 10). */
  restDays?: string;
  /** Observación (ej: F411+F3). */
  observation?: string;
  /** Médico responsable (ej: Dr(a). Juan Marcelo Cabello Merida). */
  doctorName?: string;
  /** Número de CRM (ej: CRM 161792 SP). */
  doctorCrm?: string;
  /** Dirección del médico. */
  doctorAddress?: string;
  /** Fecha y hora de la firma digital (ej: 23/07/2026 - 10:51:28). */
  signedAt?: string;
  /** Código/enlace de receta digital (ej: r.mevosaude.com.br/MMOP4TW). */
  digitalPrescriptionUrl?: string;
  createdBy: string;
}

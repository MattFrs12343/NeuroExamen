export type ViewType = 'login' | 'dashboard' | 'orders' | 'new-order' | 'profile' | 'patients' | 'recetas' | 'new-receta' | 'encaminhamentos' | 'new-encaminhamento' | 'atestados' | 'new-atestado' | 'formula-leite' | 'new-formula-leite' | 'receituarios' | 'new-receituario' | 'laudos' | 'new-laudo';

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
  /** Teléfono del paciente — para contacto directo (ej: WhatsApp). */
  patientPhone?: string;
  date: string; // YYYY-MM-DD
  codeCID: string;
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
  createdBy: string;
  /** Token de verificación pública — se genera solo al crear el pedido. */
  token?: string;
  /** Código de acceso de 4 dígitos (cosmético, estilo Mevo — la verificación real es por token). */
  accessCode?: string;
  /** URL pública de verificación (/api/verificar/orders/{token}). */
  validationUrl?: string;
}

export interface ClinicProfile {
  name: string;
  secretaria?: string;
  sistema?: string;
  address?: string;
  phone?: string;
  cnpj?: string;
}

/**
 * Perfil de Laudo Pericial por clínica — viene de GET /api/laudo-clinics
 * (tabla `laudo_clinics`, colgada de `receta_clinics`). Todos los campos son
 * opcionales: una clínica sin perfil de laudo cargado usa un fallback
 * genérico en la UI.
 */
export interface LaudoClinicProfile {
  /** Nombre de la clínica en receta_clinics (coincide con ClinicProfile.name). */
  name: string;
  secretaria?: string;
  sistema?: string;
  address?: string;
  phone?: string;
  cnpj?: string;
  /** Médico que firma el laudo de esta clínica. */
  doctorName?: string;
  doctorCrm?: string;
  /** Razón social / nombre fiscal que se imprime en el laudo. */
  clinicNameFiscal?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  /** Párrafo fijo "Base de informações:" del laudo. */
  baseInfo?: string;
  /** Narrativa con la que arranca la plantilla (editable). */
  defaultNarrative?: string;
  /** Local por defecto, ej: "Campinas - SP". */
  local?: string;
  /** Logo del membrete como data URI base64 (listo para <img src>), o null. */
  logo?: string | null;
  primaryColor?: string;
  primaryDark?: string;
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
  /** CPF del paciente — texto libre (admite números, letras y caracteres). */
  patientCpf?: string;
  /** Teléfono del paciente — para contacto directo (ej: WhatsApp). */
  patientPhone?: string;
  observations?: string;
  medications: MedicationLine[];
  createdBy: string;
  /** Token de verificación pública — se genera solo al crear la receta. */
  token?: string;
  /** Código de acceso de 4 dígitos (cosmético, estilo Mevo — la verificación real es por token). */
  accessCode?: string;
  /** URL pública de verificación (/api/verificar/recetas/{token}). */
  validationUrl?: string;
}

/**
 * Hoja de receituário libre — ver Receituario.tsx (formulario) y
 * ReceituariosList.tsx (listado/histórico): o médico escolhe uma clínica,
 * escreve texto livre e (opcionalmente) nome/telefone/data do paciente
 * como texto solto (sem vínculo a um registro de Patient). Sem PUT: cada
 * guardado cria uma fila nova.
 */
export interface Receituario {
  id: string;
  clinicName?: string;
  clinicSecretaria?: string;
  clinicSistema?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicCnpj?: string;
  patientName?: string;
  /** Teléfono/WhatsApp del paciente — solo para el botón de WhatsApp, NUNCA se imprime. */
  patientPhone?: string;
  /** Data da consulta — YYYY-MM-DD. */
  date?: string;
  content: string;
  createdBy: string;
  /** Token de verificação pública — só existe após assinar. */
  token?: string;
  accessCode?: string;
  /** URL pública de verificação (/api/verificar/receituarios/{token}). */
  validationUrl?: string;
}

export interface Encaminhamento {
  id: string;
  patientId: string;
  patientName: string;
  patientIdentityCard?: string;
  date?: string; // YYYY-MM-DD — opcional
  patientAge?: string;
  /** Teléfono del paciente — para contacto directo (ej: WhatsApp). */
  patientPhone?: string;
  hd?: string;
  motivo?: string;
  clinicName?: string;
  clinicSecretaria?: string;
  clinicSistema?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicCnpj?: string;
  /** Perfil de documento/impresión usado al crearlo (neuromobius | neuroisbe). */
  templateId?: 'neuromobius' | 'neuroisbe';
  specialists: string[]; // ids del catálogo specialist_catalog
  createdBy: string;
  /** Token de verificación pública — se genera solo al crear el encaminhamento. */
  token?: string;
  /** Código de acceso de 4 dígitos (cosmético, estilo Mevo — la verificación real es por token). */
  accessCode?: string;
  /** URL pública de verificación (/api/verificar/encaminhamentos/{token}). */
  validationUrl?: string;
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
  /** Teléfono del paciente — para contacto directo (ej: WhatsApp). */
  patientPhone?: string;
  /** Clínica / emisor del documento — snapshot al guardar (igual que en Recetas). */
  clinicName?: string;
  clinicSecretaria?: string;
  clinicSistema?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicCnpj?: string;
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

/** Una fila de la tabela "B) Sinais e sintomas clínicos presentes" da ficha de Fórmulas Infantis. */
export interface SymptomEntry {
  id: string;
  category: 'cutaneos' | 'gastrintestinais' | 'respiratorios' | 'outros';
  label: string;
  checked: boolean;
  idadeInicial?: string;
  tempoLatencia?: string;
  duracao?: string;
  frequencia?: string;
  ultimoEpisodio?: string;
  tratamento?: string;
}

/** Una fila de la tabela "C) Exames subsidiários realizados" da ficha de Fórmulas Infantis. */
export interface ExamEntry {
  id: string;
  category: 'hipersensibilidade' | 'gastrointestinal' | 'anatomopatologico' | 'outros';
  /** Fijo para las primeras 3 categorías; editable por el usuario en 'outros'. */
  label: string;
  /** ( ) Sim ( ) Não — no aplica en 'outros' (fila de "Provocação" libre). */
  sim?: boolean | null;
  data?: string;
  resultado?: string;
}

/** Fila de "Caso SIM anote os últimos pesos e datas" (sección D). */
export interface NutritionHistoryEntry {
  data?: string;
  peso?: string;
}

export interface FormulaLeite {
  id: string;
  patientId: string;
  patientName: string;
  createdBy: string;

  /** Data da primeira consulta (ej: 23/07/2026). */
  firstConsultDate?: string;

  // A) Identificação
  /** Nascimento do paciente — string libre (ej: 08/05/1997). */
  patientBirthDate?: string;
  motherName?: string;
  /** CNS do paciente. */
  patientCns?: string;
  /** Teléfono del paciente — para contacto directo (ej: WhatsApp). */
  patientPhone?: string;
  /** Nome do profissional que acompanha a criança. */
  professionalName?: string;
  institutionName?: string;
  /** Código CNES da instituição. */
  cnes?: string;
  solicitation?: string;
  quantityMonth?: string;
  /** Código CID (ej: K52.2). */
  cid?: string;
  diagnostico?: string;

  // B) Sinais e sintomas clínicos presentes
  /** "Especifique os sintomas mais exacerbados". */
  symptomsNotes?: string;
  symptoms: SymptomEntry[];

  // C) Exames subsidiários realizados
  exams: ExamEntry[];

  // D) Avaliação da condição nutricional
  weightKg?: string;
  heightCm?: string;
  percentileBelow10?: 'sim' | 'nao' | '';
  weightDeceleration?: 'sim' | 'nao' | '';
  weightDecelerationTime?: string;
  nutritionHistory: NutritionHistoryEntry[];

  // Rodapé / assinatura do médico responsável (CNS + CPF, não CRM)
  footerDate?: string;
  doctorCns?: string;
  doctorCpf?: string;

  // F) Conduta (uso restrito a SES-SP)
  condutaOption?: 'nao_preenche' | 'liberado' | '';
  formulaLatas?: string;
  formulaMeses?: string;
  formulaTypes: string[];
  dataRetorno?: string;
  previsaoProvocacao?: string;
  avaliador?: string;
}

/** Resultado de la "Conclusão Pericial" del laudo. */
export type LaudoConclusao = 'apto' | 'inapto_temporario' | 'inapto_definitivo';

/**
 * Laudo Pericial Médico — sección "Laudos": el médico elige la clínica (cada
 * una tiene una estructura de laudo única, ver data/laudoProfiles.ts), edita
 * los datos del paciente y la narrativa clínica, y lo imprime/firma. El texto
 * y los IDs siguen un perfil por clínica como Encaminhamentos con profiles.
 */
export interface Laudo {
  id: string;
  /** Paciente vinculado (si se eligió de la base) — opcional, nombre en free text. */
  patientId?: string;
  patientName: string;
  /** CPF del paciente (misma fuente que patientIdentityCard). Opcional. */
  patientIdentityCard?: string;
  /** Nascimento — string libre (ej: 03/05/1967). */
  patientBirthDate?: string;
  /** Teléfono del paciente — para contacto directo (ej: WhatsApp). */
  patientPhone?: string;
  /** Benefício/Órgão que solicita la perícia (ej: IAMSPE). Se imprime entre paréntesis junto al nombre. */
  orgao?: string;
  /** Fecha del laudo — YYYY-MM-DD. */
  date?: string;
  /** Local (ciudad - UF), ej: Campinas - SP. */
  local?: string;
  /** Narrativa clínica (texto libre, varios párrafos). */
  narrative: string;
  /** Códigos CID 10 (texto libre, ej: F33 + F40 + F41.9). */
  cids?: string;
  /** Resumen de diagnóstico adicional (se autocompleta con los CIDs si está vacío). */
  diagnostico?: string;
  /** Opción elegida de la Conclusão Pericial. */
  conclusao?: LaudoConclusao;
  /** Período sugerido de afastamento en días (ej: 190). */
  afastamentoDias?: number;
  observacoes?: string;
  /** Snapshot del emisor — datos fijos por clínica (ver laudoProfiles.ts). */
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  doctorName?: string;
  doctorCrm?: string;
  /** Clave del perfil de Laudo usado (clinica_saude_campinas | ...). */
  templateId?: string;
  createdBy: string;
  /** Token de verificación pública — se genera solo al crear el laudo. */
  token?: string;
  /** Código de acceso de 4 dígitos. */
  accessCode?: string;
  /** URL pública de verificación (/api/verificar/laudos/{token}). */
  validationUrl?: string;
}

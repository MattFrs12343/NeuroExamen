export type ViewType = 'login' | 'dashboard' | 'orders' | 'new-order' | 'profile';

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

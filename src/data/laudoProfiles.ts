// ── Perfiles de Laudo Pericial por clínica ──────────────────────────────────
// NOTA (2026-09-14): este archivo está OBSOLETO como fuente de verdad. El
// perfil de laudo de cada clínica (emisor, base info, narrativa default,
// local, logo) ahora vive en la tabla `laudo_clinics` de la base de datos,
// servida por GET /api/laudo-clinics (ver LaudoClinicProfile en types y
// findLaudoClinicProfile en lib/laudoClinic.ts). El selector de clínicas del
// Laudo usa el MISMO dropdown que el Receituário (ClinicProfileField +
// receta_clinics), y al elegir una clínica se carga su perfil de laudo si lo
// tiene. Este archivo se conserva solo como referencia del perfil original
// de CLINICA SAUDE CAMPINAS (la del PDF Ludos.pdf), cuyo seed vive en
// server-php/sql/migration_laudo_clinics.sql.

import logoSaudeCampinas from '../assets/logo-saude-campinas.png';

export type LaudoProfileKey = 'clinica_saude_campinas';

export interface LaudoProfile {
  key: LaudoProfileKey;
  label: string;
  // UI de la sección
  primary: string;
  primaryDark: string;
  // Emisor / firma del documento (pie de página fijo)
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  doctorName: string;
  doctorCrm: string;
  /** Local por defecto, ej: "Campinas - SP". */
  local: string;
  /** Párrafo fijo que encabeza el laudo bajo "Base de informações:". */
  baseInfo: string;
  /** Narrativa con la que arranca la plantilla (la edita el médico). */
  defaultNarrative: string;
  /** Logo del membrete, arriba del título — igual que en Ludos.pdf. Opcional: las
   *  clínicas que se agreguen después pueden no tener uno todavía. */
  logo?: string;
}

export const DEFAULT_LAUDO_PROFILE: LaudoProfileKey = 'clinica_saude_campinas';

export const LAUDO_PROFILES: Record<LaudoProfileKey, LaudoProfile> = {
  clinica_saude_campinas: {
    key: 'clinica_saude_campinas',
    label: 'Clínica Saúde Campinas',
    primary: '#0F4C81',
    primaryDark: '#0a3a63',
    logo: logoSaudeCampinas,
    // Razón social + dirección + teléfono tal cual figuran en el pie del
    // laudo real (Ludos.pdf) — es el nombre FISCAL de la clínica, distinto
    // del nombre de marca "Clínica Saúde Campinas" del logo/label de la UI.
    clinicName: 'CLINICA MEDICA E ODONTOLOGICA N&V LTDA',
    clinicAddress: 'RUA BERNARDINO DE CAMPOS, 927 - - CENTRO - CAMPINAS / SP',
    clinicPhone: '(19) 99558-9842',
    doctorName: 'DR. JUAN MARCELO CABELLO MERIDA',
    doctorCrm: 'CRM: 161792/SP',
    local: 'Campinas - SP',
    // SIN texto pre-escrito, a propósito: la base info y la narrativa las
    // escribe el médico para cada paciente. Antes CLINICA SAUDE CAMPINAS
    // traía la base info y una narrativa completa de ejemplo (con CIDs y
    // diagnóstico de un paciente real) que, por el fallback de formato de
    // getLaudoProfileFor(), se le copiaba a TODAS las clínicas sin perfil
    // propio — se corría el riesgo de firmar un laudo con el texto de otro.
    // Cada clínica carga el suyo desde el editor de perfil de laudo.
    baseInfo: '',
    defaultNarrative: '',
  },
};

export const LAUDO_PROFILE_KEYS = Object.keys(LAUDO_PROFILES) as LaudoProfileKey[];

export const getLaudoProfile = (key?: string | null): LaudoProfile =>
  (key && LAUDO_PROFILES[key as LaudoProfileKey]) || LAUDO_PROFILES[DEFAULT_LAUDO_PROFILE];
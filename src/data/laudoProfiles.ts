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
    baseInfo:
      'Segundo informações prestadas pela(o) paciente, averiguadas em ' +
      'registros de prontuários médicos e exames complementares.',
    defaultNarrative:
      'Declaro que o referido paciente encontra-se em seguimento por ' +
      'Ansiedade, Estados Depressivos, e Agorafobia.\n' +
      'CID 10 F33 + CID 10 F40 + CID 10 F41.9\n' +
      'Faz uso de inúmeras drogas psicotrópicas em altas doses com efeito ' +
      'sedativo dado o efeito psicotrópico do tratamento não apresenta ' +
      'condições laborais atuais.\n' +
      'Paciente foi encaminhado para PSIQUIATRIA para iniciar seu processo de ' +
      'reabilitação não conseguindo fazer nenhuma atividade física nem laboral ' +
      'por tempo indeterminado.\n' +
      'Conforme laudo em anexo do especialista em anexo.\n' +
      'A segurado acima relata que não tem condições de exercer sua atividade ' +
      'laborativas.\n' +
      'Solicito do prezado colega medico-perito, que após sua análise detalhada ' +
      'desta ponderação e considerando-se os fatos relatados de seu impedimento ' +
      'da sua atividade laborativa com base nas informações prestadas pelo ' +
      'médico especialista (Relatório médico em anexo), com regulamento pelo ' +
      'decreto número 3.048/1999.\n' +
      'Desta forma, solicito desse órgão a realização da perícia medica e ' +
      'caracterização de sua incapacidade e a concessão do benefício para que ' +
      'o funcionária/segurada possa usufruir dos direitos previdenciários.',
  },
};

export const LAUDO_PROFILE_KEYS = Object.keys(LAUDO_PROFILES) as LaudoProfileKey[];

export const getLaudoProfile = (key?: string | null): LaudoProfile =>
  (key && LAUDO_PROFILES[key as LaudoProfileKey]) || LAUDO_PROFILES[DEFAULT_LAUDO_PROFILE];
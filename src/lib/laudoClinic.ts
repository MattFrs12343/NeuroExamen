import type { LaudoClinicProfile } from '../types';
import { normalizeClinicKey } from './clinic';

/**
 * Resuelve el perfil de laudo de una clínica entre los cargados por
 * GET /api/laudo-clinics, comparando el nombre normalizado.
 */
export const findLaudoClinicProfile = (
  profiles: LaudoClinicProfile[],
  clinicName?: string | null,
): LaudoClinicProfile | undefined => {
  const key = normalizeClinicKey(clinicName);
  if (!key) return undefined;
  return profiles.find(p => normalizeClinicKey(p.name) === key);
};

// Clínica que define el FORMATO del laudo pericial. Todas las clínicas SIN
// perfil propio heredan su formato (firma médica, base info, narrativa base);
// solo el nombre/dirección/teléfono de la clínica se toman de cada una
// (receta_clinics). El logo NO se hereda: cada clínica muestra el suyo propio
// solo si lo tiene cargado (ver getLaudoProfileFor abajo).
const DEFAULT_LAUDO_CLINIC = 'CLINICA SAUDE CAMPINAS';

/**
 * TRUE si el perfil tiene ALGÚN dato propio de laudo (no es una fila vacía).
 * El GET /api/laudo-clinics devuelve TODAS las clínicas de receta_clinics con
 * LEFT JOIN a laudo_clinics: una clínica SIN perfil igual aparece en la lista,
 * pero con doctorName/baseInfo/etc en null. Esas filas vacías NO cuentan como
 * "perfil propio" — deben caer en el fallback del formato estándar.
 */
const hasLaudoProfileData = (p?: LaudoClinicProfile): boolean => {
  if (!p) return false;
  return [
    p.doctorName, p.doctorCrm,
    p.clinicNameFiscal, p.clinicAddress, p.clinicPhone,
    p.baseInfo, p.defaultNarrative, p.local, p.logo,
  ].some(v => v !== undefined && v !== null && v !== '');
};

/**
 * Devuelve el perfil PROPIO de la clínica solo si tiene datos de laudo
 * (ignora las filas vacías que el API devuelve para clínicas sin perfil).
 */
export const getLaudoOwnProfile = (
  profiles: LaudoClinicProfile[],
  clinicName?: string | null,
): LaudoClinicProfile | undefined => {
  const own = findLaudoClinicProfile(profiles, clinicName);
  return hasLaudoProfileData(own) ? own : undefined;
};

/**
 * Devuelve el perfil de laudo para una clínica: el propio si existe y tiene
 * datos, o el perfil por defecto (CLINICA SAUDE CAMPINAS) si aún no tiene uno.
 * Así las clínicas nuevas ya salen con el mismo formato aprobado.
 */
export const getLaudoProfileFor = (
  profiles: LaudoClinicProfile[],
  clinicName?: string | null,
): LaudoClinicProfile | undefined => {
  const own = getLaudoOwnProfile(profiles, clinicName);
  if (own) return own;
  const fallback = findLaudoClinicProfile(profiles, DEFAULT_LAUDO_CLINIC);
  if (!fallback) return undefined;
  // El formato (doctor, base info, narrativa) SÍ se hereda del default, pero
  // el logo NO: cada clínica solo muestra el suyo propio si lo tiene cargado.
  return { ...fallback, logo: null as string | null };
};

/**
 * Clave i18n del título impreso según la variante elegida para ESTE laudo
 * (ver Laudo.tituloTipo en types) — a diferencia del resto del perfil, el
 * título NO es un default de clínica, el médico lo elige documento por
 * documento. 'pericial' (default, incluye laudos viejos sin el campo) imprime
 * el título histórico.
 */
export const laudoTituloI18nKey = (
  tipo?: string | null,
): 'print_laudo_title_pericial' | 'print_laudo_title_medico' =>
  tipo === 'medico' ? 'print_laudo_title_medico' : 'print_laudo_title_pericial';
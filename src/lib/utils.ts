import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** True solo cuando el paciente tiene un documento real (no vacío, 'N/A' ni placeholder 'NA-*'). */
export function hasIdentity(value?: string): boolean {
  if (!value) return false;
  const v = value.trim();
  return v !== '' && v !== 'N/A' && !v.startsWith('NA-');
}

/**
 * Pacientes cuyo nombre normalizado coincide exactamente con `query`. El
 * nombre NO es único en la base (no hay constraint), así que puede haber
 * más de un resultado: quien llama debe negarse a vincular automáticamente
 * cuando `length > 1` en vez de tomar el primero, o el documento termina
 * asociado (y, en los módulos que imprimen el nombre desde el registro
 * vinculado, impreso) con el paciente equivocado.
 */
export function findPatientsByExactName<T extends { name: string }>(
  patients: T[],
  query: string,
  normalize: (s: string) => string = s => s.trim().toLowerCase(),
): T[] {
  const key = normalize(query);
  if (!key) return [];
  return patients.filter(p => normalize(p.name) === key);
}

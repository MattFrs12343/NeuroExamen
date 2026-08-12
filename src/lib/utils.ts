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

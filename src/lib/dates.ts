/**
 * Helpers de fechas compartidos.
 *
 * En la base las fechas se guardan SIEMPRE en formato ISO (YYYY-MM-DD y
 * YYYY-MM-DD HH:MM:SS). En los formularios el médico escribe en formato
 * brasileño (DD/MM/YYYY), así que:
 *   - Al GUARDAR:  toISOSafe() convierte lo que escribió el usuario a ISO.
 *   - Al EDITAR:   isoToBRDate()/isoToBRDateTime() devuelven lo almacenado a
 *                  DD/MM/YYYY para que la máscara del campo lo muestre bien.
 *   - Al MOSTRAR:  formatDateBR()/formatDateTimeBR() formatean ISO → DD/MM/YYYY
 *                  (aceptan un valor ya en DD/MM/YYYY y lo pasan igual).
 */

const pad2 = (n: number) => String(n).padStart(2, '0');

/** `new Date()` → `YYYY-MM-DD` (para valores por defecto). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** `new Date()` → `YYYY-MM-DD HH:MM:SS` (para valores por defecto). */
export function toISODateTime(d: Date): string {
  return `${toISODate(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;
const BR_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const BR_DATETIME_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: - | )(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Normaliza una fecha ingresada por el usuario (DD/MM/YYYY o
 * DD/MM/YYYY - HH:MM:SS) a formato ISO. Si ya viene en ISO, la deja igual.
 * Devuelve `undefined` para valores vacíos. Cualquier otra cadena se pasa
 * tal cual (nunca se corrompe lo que no se reconoce).
 */
export function toISOSafe(value?: string | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (ISO_DATE_RE.test(v) || ISO_DATETIME_RE.test(v)) return v;

  const dm = v.match(BR_DATETIME_RE);
  if (dm) {
    const [, dd, mm, yyyy, hh, mi, ss] = dm;
    const time = `${hh}:${mi}${ss ? ':' + ss : ':00'}`;
    return `${yyyy}-${pad2s(mm)}-${pad2s(dd)} ${time}`;
  }

  const d = v.match(BR_DATE_RE);
  if (d) {
    const [, dd, mm, yyyy] = d;
    return `${yyyy}-${pad2s(mm)}-${pad2s(dd)}`;
  }

  return v;
}

const pad2s = (s: string) => (s.length === 1 ? '0' + s : s);

/** ISO `YYYY-MM-DD` → `DD/MM/YYYY` (passthrough si no encaja). */
export function isoToBRDate(value?: string | null): string {
  if (!value) return '';
  const v = value.trim();
  const m = v.match(ISO_DATE_RE);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

/** ISO `YYYY-MM-DD HH:MM:SS` → `DD/MM/YYYY - HH:MM:SS` (passthrough si no encaja). */
export function isoToBRDateTime(value?: string | null): string {
  if (!value) return '';
  const v = value.trim();
  const m = v.match(ISO_DATETIME_RE);
  if (m) return `${m[3]}/${m[2]}/${m[1]} - ${m[4]}:${m[5]}${m[6] ? ':' + m[6] : ':00'}`;
  return isoToBRDate(v);
}

/** Para mostrar: fecha ISO (o ya-DD/MM/YYYY) → `DD/MM/YYYY`. */
export function formatDateBR(value?: string | null): string {
  if (!value) return '—';
  return isoToBRDate(value) || '—';
}

/** Para mostrar: fecha-hora ISO (o ya-DD/MM/YYYY - HH:MM:SS) → `DD/MM/YYYY - HH:MM:SS`. */
export function formatDateTimeBR(value?: string | null): string {
  if (!value) return '—';
  return isoToBRDateTime(value) || '—';
}
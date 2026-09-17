/**
 * Envío por WhatsApp usando wa.me — no requiere API/token, solo abre un
 * chat con el número del paciente y un mensaje pre-cargado que el médico
 * puede editar antes de mandar.
 *
 * openWhatsApp() se llama SIEMPRE de forma síncrona, dentro del handler de
 * click, ANTES de guardar el documento — no después. Ya se conoce todo lo
 * necesario para armar el mensaje (teléfono, nombre del paciente, fecha)
 * sin esperar la respuesta del guardado, así que no hay ningún motivo para
 * esperar: un window.open() que espera un fetch async pierde el "user
 * gesture" del click original y el navegador lo trata como pop-up no
 * solicitado (bloqueado en Chrome/Safari/Firefox) — eso es exactamente lo
 * que pasaba antes (versión con "reservar pestaña en blanco y redirigir
 * después" — se sacó por no ser confiable). Abriendo la URL real
 * directamente en el mismo tick del click, se comporta igual que un
 * <a target="_blank"> normal, que ningún navegador bloquea.
 */

/**
 * Normaliza un teléfono en texto libre al formato que espera wa.me (solo
 * dígitos, con código de país).
 *
 * El desafío real: un número de 11 dígitos sin más contexto es AMBIGUO —
 * puede ser un brasileño sin código de país (DDD de 2 + 9 dígitos = 11) o
 * un boliviano CON código de país (591 + 8 dígitos = 11), y ningún cálculo
 * de longitud puede distinguirlos. Por eso la señal real es si el usuario
 * escribió el "+" (o el prefijo internacional "00") — eso es una
 * declaración explícita de "este número YA tiene código de país, no le
 * agregues nada". Solo cuando NO hay ese prefijo se asume que es un
 * número brasileño local (DDD + número, 10-11 dígitos) y se le antepone
 * el 55 — que es el caso de uso por defecto de la clínica.
 */
export function normalizePhoneForWhatsApp(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasExplicitCountryCode = trimmed.startsWith('+') || trimmed.startsWith('00');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  let result: string;
  if (hasExplicitCountryCode) {
    // "+591 71234567" o "00591 71234567" → se respeta tal cual (menos el
    // prefijo "00", que wa.me no espera — solo quiere los dígitos).
    result = trimmed.startsWith('00') ? digits.slice(2) : digits;
  } else if (digits.length === 10 || digits.length === 11) {
    result = `55${digits}`;
  } else {
    result = digits;
  }

  // Un número real (código de país + abonado) nunca tiene menos de 8
  // dígitos en total — ej. "+591" solo (código de país de Bolivia sin el
  // número en sí, dato incompleto) da como resultado "591", 3 dígitos, y
  // abriría un wa.me/591 roto en silencio en vez de avisar que falta el
  // número. Se corta acá con null para que el llamador muestre el alert de
  // "teléfono inválido" en vez de intentar abrir un link que no sirve.
  if (result.length < 8) return null;

  return result;
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized) return null;
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${query}`;
}

export type OpenWhatsAppResult = 'ok' | 'invalid-phone';

/**
 * Abre wa.me en una pestaña nueva. Debe llamarse de forma síncrona dentro
 * del handler de click (nunca después de un await) — ver el docblock de
 * arriba.
 *
 * Usa un <a target="_blank"> sintético (crear, hacer click, sacar) en vez
 * de window.open(url, '_blank', 'noopener,noreferrer') — se cambió porque
 * varios médicos reportaban el aviso de "el navegador bloqueó la ventana"
 * de forma constante, con pop-ups habilitados. El tercer argumento de
 * window.open() (aunque sea solo "noopener,noreferrer") hace que algunos
 * navegadores/extensiones de privacidad lo traten como pedido de "ventana
 * emergente" en vez de pestaña nueva, y lo bloqueen con reglas más
 * estrictas que a una navegación de <a> normal — incluso con gesto de
 * usuario genuino. Un click() sintético sobre un <a> real NO pasa por
 * window.open() en absoluto, así que los bloqueadores de pop-ups
 * (que específicamente vigilan llamadas a window.open/showModalDialog) ni
 * se enteran — es indistinguible de un click real del usuario en un link.
 */
export function openWhatsApp(phone: string, message: string): OpenWhatsAppResult {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return 'invalid-phone';

  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return 'ok';
}

/**
 * "createdBy" ya viene con "Dr." o "Dr(a)." al principio (ver doctor.php) —
 * el mensaje pone su propio "de Dr(a) {nombre}", así que hay que sacar el
 * prefijo para no duplicarlo ("de Dr(a) Dr. Juan...").
 */
export function stripDoctorPrefix(createdBy: string): string {
  return createdBy.replace(/^Dr\.?\s*\(?a\)?\.?\s*/i, '').trim();
}

export interface DocumentWhatsAppMessageInfo {
  patientName: string;
  /** Frase completa con posesivo y género correctos en portugués — ej.
   * "seu atestado", "sua receita médica" (recibe la frase entera, no solo
   * el sustantivo, porque el género/posesivo varía por tipo de documento). */
  docTypeLabel: string;
  doctorName: string;
  /** Si falta (documento sin verificación pública generada aún — no debería
   * pasar para nada creado después de este cambio), se usa un mensaje
   * simple sin link/código en vez de mostrar campos vacíos. */
  validationUrl?: string;
  token?: string;
  accessCode?: string;
}

/**
 * Mensaje de aviso al paciente — mismo formato que ya usa Mevo Saúde (link
 * de verificación + código da prescrição + código de acesso), para que el
 * paciente reconozca el formato, pero con los datos REALES de NeuroExámenes
 * (nuestro link de verificación, nuestro token, nuestro médico). En
 * portugués porque el paciente que lo recibe es el destinatario real de los
 * documentos (todos en pt-BR), no el médico que usa la app.
 */
export function buildDocumentWhatsAppMessage(info: DocumentWhatsAppMessageInfo): string {
  const { patientName, docTypeLabel, doctorName, validationUrl, token, accessCode } = info;

  if (!validationUrl || !token) {
    // Fallback — no debería pasar en la práctica (el token se genera al
    // crear el documento), pero evita mandar un mensaje con campos vacíos
    // si algo falló en la generación.
    return `Olá ${patientName}, ${docTypeLabel} está disponível.`;
  }

  const accessLine = accessCode ? `\nCódigo de acesso: ${accessCode}` : '';
  return `Olá ${patientName}, ${docTypeLabel} de Dr(a) ${doctorName} está disponível.\n\n`
    + `Acesse pelo link:\n${validationUrl}\n\n`
    + `Código da prescrição: ${token}${accessLine}`;
}

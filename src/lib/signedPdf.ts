const API = (import.meta.env.VITE_API_URL as string) || 'http://localhost/neuro-api/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('neuro_token');
  if (!token) throw new Error('Sin conexión al servidor.');
  return { Authorization: `Bearer ${token}` };
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return data.error;
  } catch { /* respuesta no era JSON — se usa el mensaje genérico */ }
  return fallback;
}

/**
 * Pide el PDF firmado digitalmente (PAdES) al backend y devuelve el blob —
 * usado por atestados/encaminhamentos/formula-leite, que todavía arman el
 * documento del lado del servidor con TCPDF (no pasaron por la migración a
 * captura del navegador — ver pdfCapture.ts — que sí usan Pedidos/Recetas).
 */
async function fetchSignedPdfBlob(kind: string, id: string, query?: Record<string, string>): Promise<Blob> {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const res = await fetch(`${API}/${kind}/${id}/signed-pdf${qs}`, { headers: authHeaders() });

  if (!res.ok) throw new Error(await readErrorMessage(res, 'No se pudo generar el PDF firmado.'));

  return res.blob();
}

/**
 * Manda a imprimir un blob PDF SIN pasar por la carpeta de Descargas — lo
 * carga en un iframe oculto y dispara el diálogo de impresión nativo del
 * navegador sobre ese iframe. No hay ningún <a download>, así que el
 * archivo nunca toca el disco del médico.
 */
export async function printPdfBlob(blob: Blob): Promise<void> {
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;

  // Limpieza diferida y generosa: revocar la URL o sacar el iframe apenas
  // se dispara print() cerraría el PDF debajo del diálogo de impresión
  // mientras el médico todavía lo está mirando/imprimiendo.
  const cleanup = () => {
    URL.revokeObjectURL(url);
    iframe.remove();
  };

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(cleanup, 60000);
    }
  };

  document.body.appendChild(iframe);
}

/**
 * Pide el PDF firmado y lo manda a imprimir — flujo de un solo paso usado
 * por Atestados/Encaminhamentos/Fórmulas Infantis (el servidor arma todo
 * el documento con TCPDF). Pedidos/Recetas usan el flujo de 3 pasos de
 * abajo (fetchVerificationInfo → captura en el navegador → uploadAndSignPdf)
 * en vez de esta función.
 */
export async function printSignedPdf(kind: string, id: string, query?: Record<string, string>): Promise<void> {
  const blob = await fetchSignedPdfBlob(kind, id, query);
  await printPdfBlob(blob);
}

/**
 * GET liviano — solo {token, qrContent}, sin PDF. El navegador lo pide
 * antes de capturar la plantilla real de impresión, para saber qué URL
 * codificar en el QR que va a dibujar él mismo (componente QrCodeSvg).
 */
export async function fetchVerificationInfo(kind: string, id: string): Promise<{ token: string; qrContent: string }> {
  const res = await fetch(`${API}/${kind}/${id}/signed-pdf`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'No se pudo obtener el código de verificación.'));
  return res.json();
}

/**
 * Sube el PDF que el navegador ya capturó de la plantilla real (ver
 * pdfCapture.ts) como cuerpo crudo de la petición — mismo patrón que ya
 * usa el resto del backend (lee php://input, no multipart/form-data) — y
 * devuelve el PDF ya firmado digitalmente.
 */
export async function uploadAndSignPdf(kind: string, id: string, pdfBlob: Blob, query?: Record<string, string>): Promise<Blob> {
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';
  const res = await fetch(`${API}/${kind}/${id}/signed-pdf${qs}`, {
    method: 'POST',
    // 'application/octet-stream', no 'application/pdf': el WAF (ModSecurity)
    // de HostGator bloquea POSTs con Content-Type application/pdf con 406
    // "Not Acceptable" — confirmado que rechaza incluso body vacío, sin leer
    // el contenido. El backend lee php://input crudo sin mirar este header,
    // así que el cambio no afecta nada del lado del servidor.
    headers: { ...authHeaders(), 'Content-Type': 'application/octet-stream' },
    body: pdfBlob,
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'No se pudo firmar el documento.'));
  return res.blob();
}

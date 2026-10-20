import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export interface CapturedPdf {
  blob: Blob;
  // Alto real (mm) del contenido capturado en cada página — incluye la zona
  // de 25mm reservada por CSS (ver capturing-* en index.css). El servidor
  // usa esto para dibujar el pie de firma justo debajo del contenido real,
  // en vez de a una distancia fija del borde de una A4 completa (ver
  // signUploadedPdf() en server-php/lib/signing.php).
  pageHeightsMm: number[];
}

/**
 * Captura a plantilla de impresión REAL (la misma que usa "Imprimir") a un
 * PDF de verdad, en el navegador — un canvas por cada hijo directo de
 * `.print-area-{kind}` (un hijo = una página física, mismo contrato que ya
 * usa el CSS de `@media print`). No sabe nada del contenido del documento:
 * solo rasteriza lo que ya está en el DOM.
 *
 * Cada página del PDF es una A4 completa (297mm) — NUNCA del alto exacto
 * del contenido: un PDF con páginas de tamaño no estándar hace que muchos
 * lectores/impresoras centren o reescalen la página al imprimir en papel A4
 * real, así que el pie de firma (dibujado a una distancia fija del borde de
 * la página) terminaba apareciendo lejos del borde físico real de la hoja.
 * La imagen capturada se ancla arriba con su alto real (sin estirar) y el
 * resto de la A4 queda en blanco; `pageHeightsMm` le dice al servidor dónde
 * termina el contenido real de cada página para que pueda plantar el pie de
 * firma ahí, no a 20mm del borde de una A4 casi vacía.
 *
 * El llamador es responsable de: montar el registro en el contexto,
 * agregar `body.capturing-{kind}` (revela la plantilla fuera de pantalla,
 * ver src/index.css), esperar a que termine de renderizar/cargar imágenes,
 * y sacar la clase después — ver `triggerSignAndPrint` en AppContext.tsx.
 */
export async function capturePrintAreaToPdf(kind: string, scale = 2.5): Promise<CapturedPdf> {
  const pages = Array.from(document.querySelectorAll<HTMLElement>(`.print-area-${kind} > div`));
  if (!pages.length) {
    // Pedidos compuestos SOLO por exámenes especiales (Dinamômetro/
    // Estesiômetro/Equilíbrio) no dejan nada para capturar: PrintTemplate
    // los omite a propósito durante la captura porque el servidor los arma
    // de cero con TCPDF (ver api/orders/signed-pdf.php). Subir un PDF vacío
    // es válido acá — el servidor nunca importa páginas de él en ese caso.
    if (kind === 'order') {
      const empty = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'p' });
      return { blob: empty.output('blob'), pageHeightsMm: [] };
    }
    throw new Error(`No se encontró contenido para capturar (.print-area-${kind}).`);
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'p' });
  const pageHeightsMm: number[] = [];

  // letterRendering:true — sin esto, html2canvas dibuja cada palabra con una
  // sola llamada a fillText() usando su propia reimplementación de word-wrap
  // (basada en canvas.measureText(), que no siempre coincide con el layout
  // real del navegador); cuando no coincide, corta palabras en lugares
  // random y deja huecos tratando de justificar la línea mal medida
  // ("Assinat ura", "c a r i m" — confirmado comparando el PDF firmado
  // real). Con letterRendering:true cada letra se dibuja por separado con
  // su propio avance medido, a costa de ser notablemente más lento (más
  // llamadas a fillText/measureText). No está en los tipos de
  // @types/html2canvas (desactualizados respecto a la librería real) pero
  // sí existe en runtime, de ahí el cast.
  // foreignObjectRendering:true se probó como vía para acelerar esto
  // (delega al motor nativo del navegador en vez de que html2canvas
  // reimplemente CSS a mano) pero en este proyecto dispara un fetch a una
  // URL rota ("invalid/") apenas se activa la captura y el proceso no llega
  // a terminar — se descarta, queda el renderer por defecto.
  //
  // scale:2.5 (antes 1.5) — html2canvas reimplementa el layout de texto a
  // mano (ver letterRendering arriba), así que nunca queda tan nítido como
  // el render nativo del navegador; capturar a más resolución (más píxeles
  // por mm) suaviza ese salto de calidad entre "Imprimir" (nativo) y
  // "Guardar y firmar" (captura), a costa de una captura más lenta y un PDF
  // más pesado. Si el tiempo de firma se vuelve molesto, bajar este número
  // es el primer lugar por donde recortar.
  type CaptureOptions = Parameters<typeof html2canvas>[1] & { letterRendering?: boolean };

  for (let i = 0; i < pages.length; i++) {
    const options: CaptureOptions = {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      windowWidth: pages[i].scrollWidth,
      letterRendering: true,
    };
    const canvas = await html2canvas(pages[i], options);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgHeightMm = Math.min((canvas.height / canvas.width) * A4_WIDTH_MM, A4_HEIGHT_MM);
    pageHeightsMm.push(imgHeightMm);

    if (i > 0) pdf.addPage('a4', 'p');
    pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, imgHeightMm);
  }

  return { blob: pdf.output('blob'), pageHeightsMm };
}

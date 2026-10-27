import React, { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { findLaudoClinicProfile, getLaudoProfileFor, laudoTituloI18nKey } from '../lib/laudoClinic';
import { normalizeClinicKey } from '../lib/clinic';
import { LAUDO_PROFILES } from '../data/laudoProfiles';
import { planDocIntoPanes, PX_PER_MM } from '../lib/printPagination';
import type { DocBlock, PaneBlock, PanePlan } from '../lib/printPagination';
import { RichText } from './RichText';
import type { LaudoClinicProfile, LaudoConclusaoOption } from '../types';

// Respaldo estático del perfil de Clínica Saúde Campinas (la única clínica
// hoy en uso) — GET /api/laudo-clinics todavía no está desplegado en
// producción, así que `laudoClinics` llega SIEMPRE vacío del servidor y el
// perfil (logo, base info) nunca se resuelve solo con la API. Mientras tanto
// se usa este respaldo local (mismos datos que server-php/lib/laudoProfiles.php
// usa como fallback del lado del PDF firmado) para no imprimir el laudo sin
// membrete. Sacar este fallback el día que /api/laudo-clinics esté en prod.
const CAMPINAS_STATIC = LAUDO_PROFILES.clinica_saude_campinas;
const FALLBACK_LAUDO_CLINIC_PROFILE: LaudoClinicProfile = {
  name: 'CLINICA SAUDE CAMPINAS',
  doctorName: CAMPINAS_STATIC.doctorName,
  doctorCrm: CAMPINAS_STATIC.doctorCrm,
  clinicNameFiscal: CAMPINAS_STATIC.clinicName,
  clinicAddress: CAMPINAS_STATIC.clinicAddress,
  clinicPhone: CAMPINAS_STATIC.clinicPhone,
  baseInfo: CAMPINAS_STATIC.baseInfo,
  defaultNarrative: CAMPINAS_STATIC.defaultNarrative,
  local: CAMPINAS_STATIC.local,
  logo: CAMPINAS_STATIC.logo,
};

// Documento formal (pericial) — el diseño imita el PDF Ludos.pdf: hoja
// blanca neutra, sin membretes de color, con la firma/emisor de la clínica
// en el pie. La firma SIEMPRE queda pegada al fondo de la última página:
// el contenido se mide (en un nodo oculto) y se reparte en N hojas de
// 297mm. Así un contenido corto ocupa una sola página con la firma al fondo,
// y si sobrepasa, la firma va al fondo de la última página en vez de quedar a
// mitad de hoja. El reparto lo hace planDocIntoPanes (src/lib/printPagination):
// ningún bloque se parte entre hojas y el contenido termina antes del borde
// inferior. El PDF firmado digitalmente sigue siendo de 2 páginas fijas
// (api/laudos/signed-pdf.php), no pasa por acá.
const BODY = '#1F2937';
const SECONDARY = '#6B7280';
const FAINT = '#9CA3AF';
const LINE = '#E2E8F0';

const MM = 297;               // alto A4 (210×297mm)
const SIDE_MM = 18;           // margen lateral de cada hoja (mm)
const TOP_MM = 20;            // margen superior de cada hoja (mm) — 20mm,
                              // simétrico al inferior: deja banda imprimible
                              // REAL para el encabezado de continuidad de las
                              // hojas 2+ (antes vivía en 0-10mm, pegado al
                              // borde físico, donde la impresora lo cortaba y
                              // el contenido parecía chocar con él)
const BOTTOM_MM = 20;         // margen inferior de cada hoja (mm) — 4mm más
                              // que antes: deja la zona de seguridad que
                              // pedía el documento antes del borde de la hoja
const PANE_MM = MM - TOP_MM - BOTTOM_MM; // alto útil por hoja: 297−20−20 = 257mm
const SAFETY_MM = 2;          // zona de seguridad: el contenido de cada hoja
                              // termina 2mm antes de su margen inferior, para
                              // que ninguna línea quede pegada al borde (y
                              // contra redondeos de wrap de texto)
const MIN_LINES = 2;          // líneas mínimas a cada lado de un corte
                              // (equivalente a orphans: 2 / widows: 2)
const FOOTER_GAP_PX = 28;     // aire entre el fin del contenido y la firma
const HEADER_TOP_MM = 5;      // dónde empieza el encabezado de continuidad de
                              // las hojas 2+ (dentro del margen superior de
                              // 20mm, lejos del borde físico de la hoja)
const HEADER_H_MM = 10;       // alto del encabezado: banda 5–15mm, su línea
                              // divisoria cae en 15mm → 5mm de aire con el
                              // contenido (que arranca en 20mm)

const checkbox = (checked: boolean) => (
  <span style={{ display: 'inline-block', width: '12px', height: '12px', border: `1px solid ${checked ? '#111827' : '#111827'}`, verticalAlign: 'middle', marginRight: '8px', fontFamily: 'Arial, sans-serif' }}>
    {checked ? <span style={{ display: 'block', textAlign: 'center', lineHeight: '10px', fontSize: '10px', fontWeight: 700, color: '#111827' }}>X</span> : null}
  </span>
);

/**
 * Las 3 conclusiones originales, en el texto de siempre. Se usan solo como
 * red de seguridad para un laudo que tiene `conclusao` pero ningún snapshot
 * (`conclusaoOpcoes`): la API siempre lo devuelve, pero un registro viejo o
 * una carga fallida no deben dejar la sección vacía en la impresión.
 * El snapshot del laudo manda siempre que exista.
 */
const LEGACY_CONCLUSOES: LaudoConclusaoOption[] = [
  { id: 'apto', label: 'Apto(a) para atividades laborais' },
  { id: 'inapto_temporario', label: 'Inapto(a) temporariamente para atividades laborais' },
  { id: 'inapto_definitivo', label: 'Inapto(a) definitivamente para atividades laborais' },
];

const parsePx = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Bordes superiores de las cajas de línea de un bloque, en px desde su propio
 * borde superior. Sirve para poder cortar un párrafo largo ENTRE LÍNEAS (nunca
 * por la mitad de una) — el equivalente JS de `orphans`/`widows`, que en CSS no
 * aplica porque el reparto de hojas de este documento lo hace el código y no el
 * motor de impresión.
 *
 * `Range.getClientRects()` devuelve un rectángulo por fragmento de texto en
 * línea: los <b>/<u> de una misma línea salen como rectángulos distintos que
 * primero se fusionan (se solapan en vertical) y recién después se cuentan como
 * líneas. Si el bloque no tiene texto, o el resultado no es usable, se devuelve
 * la lista vacía: el bloque se trata como indivisible.
 */
const measureLineTops = (node: HTMLElement, nodeTop: number): number[] => {
  if (!node.textContent || !node.textContent.trim()) return [];
  let raw: DOMRect[];
  try {
    const range = document.createRange();
    range.selectNodeContents(node);
    raw = Array.from(range.getClientRects());
    range.detach();
  } catch {
    return [];
  }

  const sorted = raw
    .filter((r) => r.height > 0 || r.width > 0)
    .sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: { top: number; bottom: number }[] = [];
  for (const r of sorted) {
    const last = lines[lines.length - 1];
    if (last) {
      const overlap = Math.min(last.bottom, r.bottom) - Math.max(last.top, r.top);
      const minH = Math.min(last.bottom - last.top, r.bottom - r.top);
      if (overlap > minH * 0.5) {
        last.top = Math.min(last.top, r.top);
        last.bottom = Math.max(last.bottom, r.bottom);
        continue;
      }
    }
    lines.push({ top: r.top, bottom: r.bottom });
  }

  const tops = lines.map((l) => l.top - nodeTop).filter((t) => Number.isFinite(t));
  if (tops.length < 2) return [];
  // Ascendente y dentro del bloque: si no, no se puede usar para cortar.
  if (tops.some((t, i) => i > 0 && t <= tops[i - 1])) return [];
  if (tops[tops.length - 1] > node.offsetHeight + 1) return [];
  return tops;
};

/** ¿El plan de hojas es el mismo que ya está en el estado? (evita re-render) */
const samePanes = (a: PanePlan[], b: PanePlan[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((pane, i) => {
    const other = b[i];
    if (pane.usedPx !== other.usedPx || pane.leadMarginTopPx !== other.leadMarginTopPx) return false;
    if (pane.blocks.length !== other.blocks.length) return false;
    return pane.blocks.every((pb, j) => {
      const ob = other.blocks[j];
      return pb.blockIndex === ob.blockIndex && pb.kind === ob.kind
        && pb.skipPx === ob.skipPx && pb.heightPx === ob.heightPx;
    });
  });
};

// Esta plantilla ya solo se usa para "Imprimir" (triggerDirectPrintLaudo,
// impresión nativa del navegador). "Guardar y firmar" NO pasa más por acá:
// el PDF firmado lo arma el servidor de cero con TCPDF (texto vectorial
// real, ver api/laudos/signed-pdf.php) en vez de capturar este HTML con
// html2canvas — evita el desfasaje de letras/espaciado que dejaba esa
// captura entre "Imprimir" y "Guardar y firmar" (2026-09-14).
export const PrintLaudoTemplate: React.FC = () => {
  const { t } = useTranslation();
  const { selectedLaudoForPrint, laudoClinics } = useApp();

  const measureRef = useRef<HTMLDivElement>(null);
  const [panes, setPanes] = useState<PanePlan[]>([{ blocks: [], usedPx: 0, leadMarginTopPx: 0 }]);

  const doc = selectedLaudoForPrint;

  // Perfil de laudo de la clínica actual: el propio si existe, o el formato
  // por defecto (CLINICA SAUDE CAMPINAS) — todas las clínicas usan el mismo
  // diseño aprobado, solo cambian nombre/dirección/teléfono. templateId no
  // siempre llega con el mismo formato (laudos viejos guardan la key interna
  // 'clinica_saude_campinas', laudos nuevos el nombre elegido en el dropdown
  // tal cual) — se compara normalizado, no con === literal.
  const isCampinasTemplate = doc
    ? normalizeClinicKey(doc.templateId) === 'clinicasaudecampinas'
      || normalizeClinicKey(doc.clinicName) === 'clinicasaudecampinas'
    : false;
  const profile = doc
    ? getLaudoProfileFor(laudoClinics, doc.templateId)
      || (isCampinasTemplate
          ? findLaudoClinicProfile(laudoClinics, 'CLINICA SAUDE CAMPINAS') || FALLBACK_LAUDO_CLINIC_PROFILE
          : undefined)
    : undefined;

  const formattedDate = (() => {
    if (!doc?.date) return undefined;
    try {
      const [y, m, d] = doc.date.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return doc.date;
    }
  })();

  const patientLine = `${doc?.patientName || ''}${doc?.orgao ? ` (${doc.orgao})` : ''}`;
  const cids = doc?.cids?.trim() || '';
  const diagnostico = doc?.diagnostico?.trim() || '';
  const conclusaoOpcoes = doc?.conclusaoOpcoes?.length ? doc.conclusaoOpcoes : LEGACY_CONCLUSOES;

  const clinicName = doc?.clinicName || profile?.clinicNameFiscal;
  const clinicAddress = doc?.clinicAddress || profile?.clinicAddress;
  const clinicPhone = doc?.clinicPhone || profile?.clinicPhone;
  const doctorName = doc?.doctorName || profile?.doctorName;
  const doctorCrm = doc?.doctorCrm || profile?.doctorCrm;

  // ── Plan de hojas ─────────────────────────────────────────────────────────
  // Mide el contenido real (nodo oculto, mismo ancho que la hoja) y calcula en
  // qué hoja cae cada bloque. El reparto NO lo hace el motor de impresión: las
  // hojas son fijas de 297mm con su propio margen y el contenido de cada una
  // va en una ventana con recorte, así que `break-inside`/`orphans`/`widows` de
  // CSS no aplican — el corte lo decide planDocIntoPanes, que empuja a la hoja
  // siguiente cualquier bloque que no entre entero y, si algún bloque es más
  // alto que una hoja, lo parte solo entre líneas con 2 de margen a cada lado.
  // Re-mide cuando terminan de cargar los logos: hasta entonces el <img> mide 0
  // y el reparto habría salido corto.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !doc) return;

    const measure = () => {
      const wrap = el.children[0] as HTMLElement | undefined;
      const footerEl = el.children[1]?.firstElementChild as HTMLElement | null;
      if (!wrap) return;
      const nodes = Array.from(wrap.children) as HTMLElement[];
      if (nodes.length === 0) return;

      const rects = nodes.map((n) => n.getBoundingClientRect());
      const origin = rects[0].top;
      const blocks: DocBlock[] = nodes.map((node, i) => {
        const topPx = rects[i].top - origin;
        const prevBottom = i > 0 ? rects[i - 1].bottom - origin : topPx;
        return {
          topPx,
          heightPx: rects[i].height,
          gapBeforePx: i > 0 ? Math.max(0, topPx - prevBottom) : 0,
          marginTopPx: parsePx(getComputedStyle(node).marginTop),
          lineTopsPx: measureLineTops(node, rects[i].top),
        };
      });

      const panePx = PANE_MM * PX_PER_MM;
      const footerPx = footerEl ? footerEl.getBoundingClientRect().height : 0;
      const next = planDocIntoPanes(blocks, {
        // hoja normal: alto útil − zona de seguridad inferior
        limitPx: panePx - SAFETY_MM * PX_PER_MM,
        // última hoja: además tiene que caber la firma con su aire
        lastLimitPx: panePx - FOOTER_GAP_PX - footerPx - SAFETY_MM * PX_PER_MM,
        minLines: MIN_LINES,
      });
      setPanes((prev) => (samePanes(prev, next) ? prev : next));
    };

    measure();

    // El logo entra después del primer pintado: sin re-medir, el reparto se
    // calcula con el logo a 0 de alto y la última hoja corta contenido.
    const imgs = Array.from(el.querySelectorAll('img'));
    const onLoad = () => measure();
    imgs.forEach((img) => img.addEventListener('load', onLoad));
    return () => imgs.forEach((img) => img.removeEventListener('load', onLoad));
  }, [doc]);

  if (!doc) return null;

  const sheetStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    color: BODY,
  };
  // El contenido es una LISTA de bloques, no un fragmento suelto: el reparto de
  // hojas necesita asignar bloques enteros a cada hoja (y poder recortar uno
  // entre líneas cuando no entra en ninguna), así que cada bloque tiene que ser
  // un elemento de primer nivel con su propio nodo. Los bloques opcionales
  // (logo, fecha, conclusión, afastamiento) van como `null`, que no genera nodo
  // — React.Children.toArray los descarta y los índices quedan alineados 1:1
  // con los hijos del nodo de medición.
  const contentBlock = [
    // Membrete: estructura en TRES bloques de flujo normal (logo ARRIBA →
    // título en el medio → línea debajo), cada uno con su propia
    // separación vertical, para que ningún elemento se superponga a otro.
    // El logo se acota a la caja 45×29mm PRESERVANDO su proporción
    // (maxWidth/maxHeight con width/height:auto): los logos verticales o
    // circulares (ej: +DOUTOR 425×601) quedan a 29mm de alto y no tocan el
    // título — antes otros valores fijaban proporciones que lo
    // estiraban o lo dibujaban más alto que el espacio reservado para el
    // título. display:block + margin:auto centran el logo por su cuenta.
    profile?.logo ? (
      <div key="logo" style={{ textAlign: 'center', marginBottom: '18px' }}>
        <img src={profile.logo} alt="" style={{ maxWidth: '45mm', maxHeight: '29mm', width: 'auto', height: 'auto', display: 'block', margin: '0 auto' }} />
      </div>
    ) : null,
    <p key="title" style={{
      margin: '0 0 10px 0',
      textAlign: 'center',
      fontSize: '18px',
      fontWeight: 800,
      letterSpacing: '0.08em',
      color: '#111827',
      textTransform: 'uppercase',
    }}>
      {t(laudoTituloI18nKey(doc.tituloTipo))}
    </p>,
    <hr key="rule" style={{ border: 'none', borderTop: `1px solid ${LINE}`, margin: '0 0 16px 0' }} />,

    // Datos del paciente
    <div key="patient" style={{ border: `1px solid ${LINE}`, borderRadius: '6px', padding: '12px 14px', marginBottom: '16px' }}>
      <p style={{ margin: '0 0 4px 0', fontSize: '12.5px' }}>
        <strong style={{ color: '#111827' }}>{t('print_laudo_patient_label')}: </strong>
        {patientLine}
      </p>
      <p style={{ margin: '0 0 4px 0', fontSize: '12.5px' }}>
        <strong style={{ color: '#111827' }}>{t('print_laudo_birth_label')} </strong>
        {doc.patientBirthDate || ' '}
      </p>
      <p style={{ margin: 0, fontSize: '12.5px' }}>
        <strong style={{ color: '#111827' }}>{t('print_laudo_doc_label')} </strong>
        {doc.patientIdentityCard || ' '}
      </p>
    </div>,

    // Base de informações
    <p key="base-label" style={{ margin: '0 0 4px 0', fontSize: '12.5px', color: '#111827' }}><strong>{t('print_laudo_base_info_label')}</strong></p>,
    <RichText key="base" tag="p" style={{ margin: '0 0 14px 0', fontSize: '12.5px', lineHeight: 1.55 }} html={profile?.baseInfo || ''} />,

    // Declarante + fecha — la fecha va DEBAJO del nombre del paciente,
    // no a la derecha (así figura en el PDF emitido por la clínica).
    <p key="patient-line" style={{ margin: '0 0 2px 0', fontSize: '12.5px' }}>
      {patientLine}
    </p>,
    formattedDate ? (
      <p key="date" style={{ margin: '0 0 16px 0', fontSize: '12.5px' }}>
        {formattedDate}
      </p>
    ) : null,

    // Narrativa
    <p key="perito" style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#111827' }}><strong>{t('print_laudo_ao_perito')}</strong></p>,
    <RichText key="narrative" tag="p" style={{ margin: '0 0 14px 0', fontSize: '12.5px', lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }} html={doc.narrative} />,
    <p key="grato" style={{ margin: '0 0 18px 0', fontSize: '12.5px' }}>{t('print_laudo_grato')}</p>,

    <p key="diagnostico" style={{ margin: '0 0 4px 0', fontSize: '12.5px', color: '#111827' }}>
      <strong>{t('print_laudo_diagnostico_label')} </strong>
      <span>{cids ? `CID: ${cids}` : (diagnostico || ' ')}</span>
    </p>,
    // Conclusão Pericial — sección opcional: el médico puede dejarla sin
    // marcar en el formulario para que no salga en la impresión. Las opciones
    // salen del snapshot que guarda el propio laudo (doc.conclusaoOpcoes), no
    // del catálogo actual: si después se edita o borra una opción, un laudo ya
    // emitido sigue imprimiendo el texto con el que se firmó. Va en un <div>
    // (y no en varios <p> sueltos) para que el plan de páginas trate
    // "Conclusão + opções" como un bloque único: nunca se parte entre dos
    // hojas.
    doc.conclusao && conclusaoOpcoes.length > 0 ? (
      <div key="conclusao">
        <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', color: '#111827' }}><strong>{t('print_laudo_conclusao_label')}</strong></p>
        {conclusaoOpcoes.map((opt, i) => (
          <p key={opt.id} style={{ margin: `0 0 ${i === conclusaoOpcoes.length - 1 ? 18 : 8}px 0`, fontSize: '12.5px', lineHeight: 1.7 }}>
            {checkbox(doc.conclusao === opt.id)}{opt.label}
          </p>
        ))}
      </div>
    ) : null,

    // Afastamento — opcional, igual que Conclusão Pericial: si no se cargaron
    // días, la sección no sale en la impresión. También agrupado, por el mismo
    // motivo.
    doc.afastamentoDias ? (
      <div key="afastamento">
        <p style={{ margin: '0 0 6px 0', fontSize: '12.5px', color: '#111827' }}>
          <strong>{t('print_laudo_afastamento_label')}</strong>
        </p>
        <p style={{ margin: '0 0 18px 0', fontSize: '12.5px' }}>
          {t('laudo_afastamento_de')} <strong>{doc.afastamentoDias}</strong> {t('laudo_dias')}
        </p>
      </div>
    ) : null,

    // Observações
    <p key="obs-label" style={{ margin: '0 0 6px 0', fontSize: '12.5px', color: '#111827' }}>
      <strong>{t('print_laudo_observacoes_label')}</strong>
    </p>,
    <RichText key="obs" tag="p" style={{ margin: '0 0 26px 0', fontSize: '12.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', minHeight: '40px' }} html={doc.observacoes || ' '} />,
  ];

  // Un bloque (o tramo de bloque) asignado a una hoja, ya listo para imprimir.
  // `block`: se imprime entero, como cualquier hijo de flujo. `slice`: es un
  // bloque más alto que la hoja, y de este se imprime solo un tramo de líneas
  // — el bloque se vuelve a pintar entero detrás de una ventana con la altura
  // exacta del tramo y desplazado `skipPx` hacia arriba, así el corte cae
  // BETWEEN líneas (nunca por la mitad de una) y el recorte es invisible.
  const renderPaneBlock = (pb: PaneBlock, paneIdx: number): React.ReactNode => {
    const el = docBlocks[pb.blockIndex];
    if (!el) return null;
    const key = `laudo-pg${paneIdx + 1}-blk${pb.blockIndex}-${pb.skipPx}`;
    if (pb.kind === 'block') {
      return <React.Fragment key={key}>{el}</React.Fragment>;
    }
    return (
      <div key={key} style={{ position: 'relative', height: `${pb.heightPx}px`, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            // el margin-top del bloque se compensa para que la 1ª línea
            // visible del tramo caiga justo en el borde de la ventana
            top: `${-(pb.skipPx + pb.marginTopPx)}px`,
            left: 0,
            width: '100%',
          }}
        >
          {el}
        </div>
      </div>
    );
  };


  // Los bloques que de verdad se imprimen, en orden. React.Children.toArray
  // saca los `null` (logo/fecha/conclusión/afastamiento opcionales), así que el
  // índice i de esta lista es el i-ésimo hijo del nodo de medición y coincide
  // con el `blockIndex` del plan de hojas.
  const docBlocks = React.Children.toArray(contentBlock);

  // Local e Data + bloque clínica + firma: todo viaja junto como unidad
  // (break-inside: avoid) y queda reservado para la ÚLTIMA hoja: el plan de
  // páginas mide el alto de la firma y reserva ese espacio en la última hoja, de
  // modo que el contenido de esa hoja se reparte para caber con la firma.
  const footerBlock = (
    <div style={{ marginTop: `${FOOTER_GAP_PX}px`, flexShrink: 0, breakInside: 'avoid', pageBreakInside: 'avoid' }}>


      <p style={{ margin: '0 0 6px 0', fontSize: '12.5px', color: '#111827' }}>
        <strong>{t('print_laudo_local_data')}</strong> {doc.local || profile?.local}{formattedDate ? `, ${formattedDate}` : ''}
      </p>
      <hr style={{ borderTop: `0.3mm solid ${LINE}`, margin: '3mm 0' }} />
      <p style={{ margin: '0 0 1mm 0', fontSize: '9pt', fontWeight: 700, color: '#111827' }}>{clinicName}</p>
      <p style={{ margin: '0 0 1mm 0', fontSize: '8pt', color: SECONDARY }}>{clinicAddress}</p>
      <p style={{ margin: '0 0 10mm 0', fontSize: '8pt', color: SECONDARY }}>{clinicPhone}</p>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px 0' }}>______________________________________</p>
        <p style={{ margin: '0 0 2px 0', fontSize: '12.5px', color: '#111827', fontWeight: 700 }}>{doctorName}</p>
        <p style={{ margin: 0, fontSize: '11.5px', color: '#111827' }}>{doctorCrm}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Nodo de medición (oculto, no se imprime) — replica el ancho de
          contenido de una hoja (210mm − 2·18mm de margen) sin padding ni
          estiramiento, para medir la altura real de cada bloque de contenido
          y de la firma. Contenido y firma se envuelven CADA UNO en
          overflow:hidden para que sus márgenes externos no colapsen entre sí
          (así el margen inferior del contenido y el superior de la firma se
          miden de verdad, igual que en la última hoja impresa, donde la firma
          es un item de flex y el flex no colapsa márgenes). Cada hijo de la
          envoltura de contenido es un bloque del plan de páginas. */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: '-99999px',
          visibility: 'hidden',
          width: `${210 - SIDE_MM * 2}mm`,
          ...sheetStyle,
        }}
      >
        <div style={{ overflow: 'hidden' }}>{contentBlock}</div>
        <div style={{ overflow: 'hidden' }}>{footerBlock}</div>
      </div>

      {/* ── Print area — UNA hoja física por página. Cada hoja es un bloque
          fijo de 297mm (exactamente el A4 con @page margin:0) con su PROPIO
          margen 16/18/20mm, fuerza su page-break y lleva una "ventana"
          (flex:1 + overflow:hidden + position:relative) donde se monta SOLO
          el contenido que le corresponde a esa hoja, ya repartido en bloques
          completos (nada se pinta y se recorta a mitad): así el margen
          inferior es REAL en todas las hojas, el encabezado de continuidad y
          la firma no se pisan con nada, y ninguna línea queda pegada al
          borde. La firma va al fondo de la última hoja como hijo del flex
          (queda a 20mm del borde). Este patrón de hoja exacta es el mismo de
          PrintTemplate/PrintPage (Pedidos), probado en producción. */}
      <div className="print-area print-area-laudo" style={{ ...sheetStyle }}>
        {panes.map((pane, idx) => {
          const isLast = idx === panes.length - 1;
          return (
            <div
              key={`laudo-pg-${idx + 1}`}
              style={{
                ...sheetStyle,
                width: '210mm',
                height: `${MM}mm`,
                padding: `${TOP_MM}mm ${SIDE_MM}mm ${BOTTOM_MM}mm`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                breakAfter: isLast ? 'auto' : 'page',
                pageBreakAfter: isLast ? 'auto' : 'always',
              }}
            >
              {/* Marca de agua: logo de la clínica al fondo de CADA hoja,
                  centrado. Solo cuando la clínica tiene logo (hoy únicamente
                  CLINICA SAUDE CAMPINAS). */}
              {profile?.logo && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 0,
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src={profile.logo}
                    alt=""
                    style={{ width: '140mm', height: 'auto', opacity: 0.07 }}
                  />
                </div>
              )}

              {/* Encabezado de continuidad — SOLO en las páginas 2+ (la
                  primera ya lleva el nombre en la caja de paciente). Vive en
                  la banda superior del margen imprimible de cada hoja
                  (5–15mm, el contenido empieza en 20mm), con su línea
                  divisoria fina en 15mm.

                  left/right van en SIDE_MM y no en 0: el bloque contenedor de
                  un absoluto es la PADDING-box del ancestro posicionado, así
                  que left:0 cae en el borde físico de la hoja (0mm) y el
                  nombre salía pegado al borde, 18mm desalineado del cuerpo.
                  Con SIDE_MM coincide exactamente con el PDF firmado
                  (TCPDF: SetXY($hdrPad, 8) + Line($hdrPad, 15, …) con
                  $hdrPad = 18). */}
              {panes.length > 1 && idx > 0 && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: `${HEADER_TOP_MM}mm`,
                    left: `${SIDE_MM}mm`,
                    right: `${SIDE_MM}mm`,
                    height: `${HEADER_H_MM}mm`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8mm',
                    borderBottom: `0.3mm solid ${LINE}`,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                >
                  <span style={{ fontSize: '8.5pt', color: SECONDARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
                    {`${t('print_laudo_patient_label')}: ${patientLine}`}
                  </span>
                  <span style={{ fontSize: '8pt', color: FAINT, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {t('print_laudo_page_of', { current: idx + 1, total: panes.length })}
                  </span>
                </div>
              )}

              {/* Ventana de esta hoja: solo los bloques que le tocan. El
                  margin-top del primer bloque se anula con el translateY para
                  que ninguna hoja arranque con margen fantasma (el plan lo
                  calcula como 0). En la última hoja la ventana cede espacio al
                  bloque de firma, que el plan ya dejó reservado. */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(-${pane.leadMarginTopPx}px)`,
                  }}
                >
                  {pane.blocks.map((pb: PaneBlock) => renderPaneBlock(pb, idx))}
                </div>
              </div>

              {isLast && footerBlock}
            </div>
          );
        })}
      </div>
    </>
  );
};
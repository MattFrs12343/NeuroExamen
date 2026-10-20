import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { planDocIntoPanes, PX_PER_MM } from '../lib/printPagination';
import type { DocBlock, PaneBlock, PanePlan } from '../lib/printPagination';
import type { Order } from '../types';
import { SPECIALIZED_EXAM_DOCS } from '../data/specializedExamDocs';
import type { Block } from '../data/specializedExamDocs';
import cerebroLogo from '../assets/cerebro.png';

// Documentos legales fijos (RELATÓRIO MÉDICO E JUSTIFICATIVA DE EXAME
// ESPECIALIZADO) para Dinamômetro/Estesiômetro/Equilíbrio — reemplazan la
// página genérica de PrintTemplate/PrintPage para estos exámenes puntuales.
// Texto SIEMPRE en portugués (documento médico-pericial formal para Brasil),
// sin importar el idioma de la interfaz. Reutiliza el mismo motor de
// paginación que PrintLaudoTemplate (planDocIntoPanes): el contenido se mide
// en un nodo oculto y se reparte en hojas A4 reales, con la firma anclada al
// pie de la ÚLTIMA hoja de CADA documento (cada examen es su propio
// documento completo e independiente — no se combinan aunque el pedido
// tenga varios exámenes de la misma categoría).
//
// A diferencia de PrintLaudoTemplate (que solo se usa para "Imprimir" nativo),
// estas páginas viven dentro de .print-area-order y SÍ pasan por el flujo de
// captura+firma de Pedidos (capturePrintAreaToPdf('order') en pdfCapture.ts),
// que durante la captura fuerza `padding-bottom: 25mm !important` en cada
// hoja (ver body[class*="capturing-"] .print-area > div en index.css) para
// reservarle espacio al pie de firma que agrega el servidor. Por eso
// BOTTOM_MM acá es 25 (no 20 como en Laudo): el reparto de hojas ya asume
// ese mismo margen inferior en todo momento, así "Imprimir" y "Guardar y
// firmar" se ven idénticos — no hay un salto de 5mm entre vista previa y
// documento firmado.
const BLACK = '#111827';
const SECONDARY = '#6B7280';
const LINE = '#E2E8F0';

const MM = 297;
const SIDE_MM = 18;
const TOP_MM = 20;
const BOTTOM_MM = 25;
const PANE_MM = MM - TOP_MM - BOTTOM_MM;
const SAFETY_MM = 2;
const MIN_LINES = 2;
const FOOTER_GAP_PX = 24;
const HEADER_TOP_MM = 5;
const HEADER_H_MM = 10;

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** ISO `YYYY-MM-DD` → "19 de outubro de 2026" (formato usado en el propio texto legal). */
function formatDateLongPT(iso?: string | null): string {
  const m = (iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso || '';
  const [, y, mo, d] = m;
  const day = parseInt(d, 10);
  const month = MONTHS_PT[parseInt(mo, 10) - 1] || mo;
  return `${day} de ${month} de ${y}`;
}

const parsePx = (v: string): number => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Igual a PrintLaudoTemplate: bordes superiores de línea de un bloque, en px,
 *  para poder cortarlo ENTRE líneas (nunca por la mitad) cuando no entra
 *  entero en ninguna hoja. */
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
  if (tops.some((t, i) => i > 0 && t <= tops[i - 1])) return [];
  if (tops[tops.length - 1] > node.offsetHeight + 1) return [];
  return tops;
};

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

// ─────────────────────────────────────────────────────────────────────────
// Render de bloques → JSX (cada uno, un bloque de primer nivel medible)
// ─────────────────────────────────────────────────────────────────────────

const pStyle: React.CSSProperties = { margin: '0 0 10px 0', fontSize: '12.5px', lineHeight: 1.6, color: BLACK };
const hStyle: React.CSSProperties = { margin: '18px 0 8px 0', fontSize: '13px', fontWeight: 700, color: BLACK };
const shStyle: React.CSSProperties = { margin: '12px 0 6px 0', fontSize: '12.5px', fontWeight: 700, color: BLACK };
const liStyle: React.CSSProperties = { margin: '0 0 6px 0', fontSize: '12.5px', lineHeight: 1.55, color: BLACK };

const renderBlock = (b: Block, key: string): React.ReactNode => {
  switch (b.k) {
    case 'h':
      return <p key={key} style={hStyle}>{b.t}</p>;
    case 'sh':
      return <p key={key} style={shStyle}>{b.t}</p>;
    case 'p':
      return <p key={key} style={pStyle}>{b.t}</p>;
    case 'ol':
      return (
        <ol key={key} style={{ margin: '0 0 10px 0', paddingLeft: '20px' }}>
          {b.items.map((it, i) => <li key={i} style={liStyle}>{it}</li>)}
        </ol>
      );
    case 'ul':
      return (
        <ul key={key} style={{ margin: '0 0 10px 0', paddingLeft: '20px' }}>
          {b.items.map((it, i) => <li key={i} style={liStyle}>{it}</li>)}
        </ul>
      );
    default:
      return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────
// Componente: paginación + render de un documento completo
// ─────────────────────────────────────────────────────────────────────────

interface Props {
  examId: string;
  order: Order;
  /** Si este examen es el ÚLTIMO del pedido: su última hoja no fuerza salto
   *  de página (evita una hoja en blanco extra al "Imprimir" nativo). */
  isLastExam: boolean;
}

export const SpecializedExamDocPages: React.FC<Props> = ({ examId, order, isLastExam }) => {
  const def = SPECIALIZED_EXAM_DOCS[examId];
  const measureRef = useRef<HTMLDivElement>(null);
  const [panes, setPanes] = useState<PanePlan[]>([{ blocks: [], usedPx: 0, leadMarginTopPx: 0 }]);
  const [clinicLogo, setClinicLogo] = useState<string | null>(null);

  const formattedDate = formatDateLongPT(order?.date);
  const patientName = (order?.patientName || '').toUpperCase();

  // Marca de agua de la clínica del pedido — mismo lookup que usa el PDF
  // firmado (api/clinic-logo/index.php → getOrderClinicLogoDataUri() en
  // lib/orderWatermarkPdf.php), así "Imprimir" y "Assinar e Imprimir"
  // muestran la misma marca. Sin clínica o sin logo configurado, queda null
  // y la hoja sale sin marca (igual que Laudos).
  useEffect(() => {
    const clinicName = order?.clinicName?.trim();
    if (!clinicName) return;
    const token = localStorage.getItem('neuro_token');
    if (!token) return;
    const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost/neuro-api/api';
    let cancelled = false;
    fetch(`${apiBase}/clinic-logo?name=${encodeURIComponent(clinicName)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled) setClinicLogo(data?.logo ?? null); })
      .catch(() => { if (!cancelled) setClinicLogo(null); });
    return () => { cancelled = true; };
  }, [order?.clinicName]);

  const contentBlock: React.ReactNode[] = def ? [
    <div key="logo" style={{ textAlign: 'center', marginBottom: '14px' }}>
      <img src={cerebroLogo} alt="" style={{ width: '56px', height: '56px', objectFit: 'contain', display: 'inline-block' }} />
    </div>,
    <p key="title" style={{ margin: '0 0 4px 0', textAlign: 'center', fontSize: '15px', fontWeight: 800, letterSpacing: '0.04em', color: BLACK, textTransform: 'uppercase' }}>
      RELATÓRIO MÉDICO E JUSTIFICATIVA DE EXAME ESPECIALIZADO
    </p>,
    <p key="exam-title" style={{ margin: def.examTitle2 ? '10px 0 2px 0' : '10px 0 10px 0', textAlign: 'center', fontSize: '13.5px', fontWeight: 800, color: BLACK }}>
      {def.examTitle}
    </p>,
    def.examTitle2 ? (
      <p key="exam-title-2" style={{ margin: '0 0 10px 0', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: SECONDARY }}>
        {def.examTitle2}
      </p>
    ) : null,
    <hr key="rule" style={{ border: 'none', borderTop: `1px solid ${LINE}`, margin: '0 0 16px 0' }} />,
    <div key="patient-box" style={{ border: `1px solid ${LINE}`, borderRadius: '6px', padding: '12px 14px', marginBottom: '16px' }}>
      <p style={{ margin: '0 0 4px 0', fontSize: '12.5px' }}><strong style={{ color: BLACK }}>Finalidade: </strong>{def.finalidade}</p>
      <p style={{ margin: '0 0 4px 0', fontSize: '12.5px' }}><strong style={{ color: BLACK }}>Paciente: </strong>{patientName || '—'}</p>
      <p style={{ margin: 0, fontSize: '12.5px' }}><strong style={{ color: BLACK }}>Data: </strong>{formattedDate}</p>
    </div>,
    def.examSolicitado ? (
      <p key="exame-solicitado" style={pStyle}><strong>{def.examSolicitadoLabel}: </strong>{def.examSolicitado}</p>
    ) : null,
    def.examSolicitadoList ? (
      <div key="exame-solicitado-list">
        <p style={{ ...pStyle, margin: '0 0 6px 0' }}><strong>{def.examSolicitadoLabel}:</strong></p>
        <ul style={{ margin: '0 0 10px 0', paddingLeft: '20px' }}>
          {def.examSolicitadoList.map((it, i) => <li key={i} style={liStyle}>{it}</li>)}
        </ul>
      </div>
    ) : null,
    def.solicitacaoComplementar ? (
      <p key="solicitacao-complementar" style={pStyle}><strong>Solicitação complementar: </strong>{def.solicitacaoComplementar}</p>
    ) : null,
    def.specialtyPref ? (
      <p key="specialty-pref" style={pStyle}>{def.specialtyPref}</p>
    ) : null,
    ...def.body.map((b, i) => renderBlock(b, `body-${i}`)),
  ] : [];

  const footerBlock = (
    <div style={{ marginTop: `${FOOTER_GAP_PX}px`, textAlign: 'center', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <hr style={{ border: 'none', borderTop: `0.3mm solid ${LINE}`, margin: '0 0 10px 0' }} />
      <p style={{ margin: '0 0 2px 0', fontSize: '12.5px', fontWeight: 700, color: BLACK }}>Dr. Juan Marcelo Cabello Merida</p>
      <p style={{ margin: 0, fontSize: '11.5px', color: BLACK }}>Médico Neurologista Clínico</p>
      <p style={{ margin: 0, fontSize: '11.5px', color: BLACK }}>Médico Neurofisiologista</p>
      <p style={{ margin: 0, fontSize: '11.5px', color: BLACK }}>Médico concursado em Neurologia</p>
      <p style={{ margin: '0 0 6px 0', fontSize: '11.5px', color: BLACK }}>Médico Perito Judicial do Estado de São Paulo</p>
      <p style={{ margin: '0 0 14px 0', fontSize: '11.5px', fontWeight: 700, color: BLACK }}>CRM-SP 161792</p>
      <p style={{ margin: '0 0 18px 0', fontSize: '11.5px', color: BLACK }}>São Paulo – SP, {formattedDate}.</p>
      <div style={{ borderBottom: '1px solid #000', width: '75%', margin: '0 auto 6px auto' }} />
      <p style={{ margin: 0, fontSize: '10.5px', color: SECONDARY }}>Assinatura e carimbo</p>
    </div>
  );

  const docBlocks = React.Children.toArray(contentBlock);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !def) return;

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
        limitPx: panePx - SAFETY_MM * PX_PER_MM,
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
  }, [def]);

  if (!def) return null;

  const sheetStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    color: BLACK,
  };

  const renderPaneBlock = (pb: PaneBlock, paneIdx: number): React.ReactNode => {
    const el = docBlocks[pb.blockIndex];
    if (!el) return null;
    const key = `${examId}-pg${paneIdx + 1}-blk${pb.blockIndex}-${pb.skipPx}`;
    if (pb.kind === 'block') {
      return <React.Fragment key={key}>{el}</React.Fragment>;
    }
    return (
      <div key={key} style={{ position: 'relative', height: `${pb.heightPx}px`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: `${-(pb.skipPx + pb.marginTopPx)}px`, left: 0, width: '100%' }}>
          {el}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Nodo de medición — fuera de .print-area-order vía portal (al body),
          para que capturePrintAreaToPdf('order') (que toma TODOS los
          `.print-area-order > div`) nunca lo confunda con una hoja real. */}
      {createPortal(
        <div
          ref={measureRef}
          aria-hidden
          style={{ position: 'fixed', top: 0, left: '-99999px', visibility: 'hidden', width: `${210 - SIDE_MM * 2}mm`, ...sheetStyle }}
        >
          <div style={{ overflow: 'hidden' }}>{contentBlock}</div>
          <div style={{ overflow: 'hidden' }}>{footerBlock}</div>
        </div>,
        document.body,
      )}

      {panes.map((pane, idx) => {
        const isLastPane = idx === panes.length - 1;
        const isTrulyLast = isLastPane && isLastExam;
        return (
          <div
            key={`${examId}-sheet-${idx}`}
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
              breakAfter: isTrulyLast ? 'auto' : 'page',
              pageBreakAfter: isTrulyLast ? 'auto' : 'always',
            }}
          >
            {clinicLogo && (
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
                <img src={clinicLogo} alt="" style={{ width: '140mm', height: 'auto', opacity: 0.07 }} />
              </div>
            )}
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
                  {`Paciente: ${patientName}`}
                </span>
                <span style={{ fontSize: '8pt', color: SECONDARY, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {`Página ${idx + 1} de ${panes.length}`}
                </span>
              </div>
            )}

            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(-${pane.leadMarginTopPx}px)` }}>
                {pane.blocks.map((pb) => renderPaneBlock(pb, idx))}
              </div>
            </div>

            {isLastPane && footerBlock}
          </div>
        );
      })}
    </>
  );
};

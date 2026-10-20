import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import cerebroLogo from '../assets/cerebro.png';
import { VerificationQrCard } from './VerificationQrCard';
import { RichText } from './RichText';
import type { Order, Exam } from '../types';
import { DOCTOR_CRM } from '../lib/doctor';
import { SpecializedExamDocPages } from './PrintSpecializedExamTemplate';
import { SPECIALIZED_EXAM_IDS, SPECIALIZED_EXAM_DOCS } from '../data/specializedExamDocs';

const BLUE = '#0066CC';
const GRAY = '#555555';
const BLACK = '#000000';

interface PrintExamEntry {
  id: string;
  name: string;
  category: string;
  categoryObs?: string;
}

interface PrintPageProps {
  order: Order;
  formattedDate: string;
  entry: PrintExamEntry;
  isLast: boolean;
  verificationQr?: string | null;
  verificationToken?: string | null;
}

const PrintPage: React.FC<PrintPageProps> = ({ order, formattedDate, entry, isLast, verificationQr, verificationToken }) => {
  const { t } = useTranslation();

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#fff',
        color: BLACK,
        padding: '20mm 22mm',
        boxSizing: 'border-box',
        pageBreakAfter: isLast ? 'auto' : 'always',
        breakAfter: isLast ? 'auto' : 'page',
      }}
    >

      {/* LOGO centered */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <img
          src={cerebroLogo}
          alt="NeuroExÃ¡menes"
          style={{ width: '80px', height: '80px', objectFit: 'contain', display: 'inline-block' }}
        />
      </div>

      {/* TITLE centered */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <span style={{
          fontSize: '18px',
          fontWeight: 800,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: BLUE,
        }}>
          {t('print_doc_title')}
        </span>
      </div>

      {/* Divider line */}
      <div style={{
        height: '3.5px',
        backgroundColor: BLUE,
        marginBottom: '28px',
        borderRadius: '1px',
      }} />

      {/* PATIENT + DATE (+ QR de verificaÃ§Ã£o, sÃ³ ao assinar) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '28px' }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: '13px', lineHeight: '1.7', color: '#111' }}>
          <div>
            <span style={{ fontWeight: 600 }}>{t('print_pat_info').toUpperCase()}: </span>
            <span style={{ fontWeight: 800, color: BLACK, fontSize: '13.5px' }}>
              {order.patientName.toUpperCase()}
            </span>
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>{t('print_issue_date').toUpperCase()}: </span>
            <span>{formattedDate}</span>
          </div>
          {order.clinicName && order.clinicName.trim() && (
            <div>
              <span style={{ fontWeight: 600 }}>{t('print_clinic_label').toUpperCase()}: </span>
              <span>{order.clinicName}</span>
              {(order.clinicSecretaria || order.clinicSistema) && (
                <span> — {[order.clinicSecretaria, order.clinicSistema].filter(Boolean).join(' — ')}</span>
              )}
            </div>
          )}
          {order.clinicAddress && order.clinicAddress.trim() && (
            <div style={{ fontSize: '11.5px', color: GRAY }}>{order.clinicAddress}</div>
          )}
          {(order.clinicPhone || order.clinicCnpj) && (
            <div style={{ fontSize: '11.5px', color: GRAY }}>
              {[order.clinicPhone ? `Tel: ${order.clinicPhone}` : '', order.clinicCnpj ? `CNPJ: ${order.clinicCnpj}` : ''].filter(Boolean).join(' · ')}
            </div>
          )}
          {order.observations && order.observations.trim() && (
            <div style={{ marginTop: '6px' }}>
              <span style={{ fontWeight: 600 }}>{t('print_additional_obs').toUpperCase()}: </span>
              <RichText tag="span" style={{ fontStyle: 'italic' }} html={order.observations} />
            </div>
          )}
        </div>

        {verificationQr && verificationToken && (
          <div style={{ flexShrink: 0 }}>
            <VerificationQrCard qrContent={verificationQr} token={verificationToken} accessCode={order?.accessCode} size="default" />
          </div>
        )}
      </div>

      {/* SINGLE EXAM FOR THIS PAGE */}
      <div style={{ marginBottom: '16px', minHeight: '190px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '10px',
            }}
          >
            {/* Blue checkbox */}
            <div style={{
              flexShrink: 0,
              width: '18px',
              height: '18px',
              backgroundColor: BLUE,
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '2px',
            }}>
              <svg
                viewBox="0 0 10 10"
                style={{ width: '10px', height: '10px' }}
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1.5,5.5 4,8 8.5,2" />
              </svg>
            </div>

            {/* Exam name */}
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: BLACK,
              lineHeight: '1.5',
              flex: 1,
              fontWeight: 500,
            }}>
              {t(entry.name)}
            </p>
          </div>

          {/* Category observations indented */}
          {entry.categoryObs && entry.categoryObs.trim() && (
            <div style={{
              marginLeft: '30px',
              paddingLeft: '12px',
              borderLeft: `2.5px solid ${BLUE}`,
              marginTop: '6px',
              marginBottom: '12px',
            }}>
              <RichText
                tag="p"
                style={{
                  margin: 0,
                  fontSize: '11.5px',
                  color: '#374151',
                  fontStyle: 'italic',
                  lineHeight: '1.45',
                }}
                html={entry.categoryObs}
              />
            </div>
          )}

          {/* Índice del Relatório Médico — solo para los exámenes que además
              imprimen el documento legal completo (ver SpecializedExamDocPages
              más abajo): lista los TÍTULOS de sus secciones (no el texto
              entero, que ya va en las hojas siguientes), para que quien lea
              solo esta hoja de pedido sepa qué trae adjunto. */}
          {SPECIALIZED_EXAM_IDS.has(entry.id) && (() => {
            const sectionTitles = SPECIALIZED_EXAM_DOCS[entry.id].body
              .filter((b) => b.k === 'h')
              .map((b) => b.t);
            if (!sectionTitles.length) return null;
            return (
              <div style={{ marginLeft: '30px', marginTop: '10px' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11.5px', fontWeight: 700, color: BLACK }}>
                  Relatório Médico — este exame inclui:
                </p>
                {sectionTitles.map((title, i) => (
                  <p key={i} style={{ margin: '0 0 2px 0', fontSize: '10.5px', color: GRAY, lineHeight: '1.4' }}>
                    {title}
                  </p>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* FOOTER DIVIDER */}
      <div style={{
        borderTop: '1px solid #E5E7EB',
        marginBottom: '20px',
      }} />

      {/* CID + SIGNATURE */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>

        {/* CID block */}
        <div>
          <p style={{
            margin: '0 0 6px 0',
            fontSize: '10px',
            fontWeight: 700,
            color: GRAY,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            CID
          </p>
          {order.codeCID && order.codeCID.trim() ? (
            <p style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 800,
              color: BLUE,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              borderBottom: `2.5px solid ${BLUE}`,
              paddingBottom: '2px',
              display: 'inline-block',
            }}>
              {order.codeCID}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: '12px', color: GRAY, fontStyle: 'italic' }}>—</p>
          )}
        </div>

        {/* Signature block â€” espacio reservado arriba de la lÃ­nea para que
            el mÃ©dico pueda sellar (carimbo) y firmar sin chocar con la
            barra divisoria de arriba. */}
        <div style={{ textAlign: 'center', minWidth: '220px' }}>
          <div style={{ height: '60px' }} />
          <div style={{
            borderBottom: '2px solid #000',
            marginBottom: '8px',
            width: '100%',
          }} />
          <p style={{
            margin: 0,
            fontSize: '10px',
            fontWeight: 700,
            color: GRAY,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {t('print_sign_label')}
          </p>
          {!verificationQr && (
            <p style={{ margin: '4px 0 0 0', fontSize: '10px', fontWeight: 700, color: GRAY }}>{DOCTOR_CRM}</p>
          )}
        </div>
      </div>

    </div>
  );
};

export const PrintTemplate: React.FC = () => {
  const { selectedOrderForPrint, exams, captureTarget, verificationQr, verificationToken } = useApp();

  if (!selectedOrderForPrint) return null;

  const order = selectedOrderForPrint;

  // Format date DD/MM/YYYY
  const formattedDate = (() => {
    try {
      const [y, m, d] = order.date.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return order.date;
    }
  })();

  const customExamsMap = (order.customExams as Record<string, { id: string; name: string; category: string; categoryTitle?: string }>) || {};

  // Un examen produce SIEMPRE su página genérica de siempre (checkbox +
  // nombre + observações de categoría — la "hoja de pedido" que va con el
  // paciente al técnico), y ADEMÁS, si es Dinamômetro/Estesiômetro/Equilíbrio
  // (SPECIALIZED_EXAM_IDS), su propio documento legal completo de varias
  // hojas (ver PrintSpecializedExamTemplate) justo después — pedido
  // explícito del médico: uno no reemplaza al otro, van juntos.
  type RenderUnit =
    | { kind: 'generic'; examId: string; exam: Exam }
    | { kind: 'specialized'; examId: string };
  const units: RenderUnit[] = [];

  order.exams.forEach((examId) => {
    let exam = exams.find(e => e.id === examId);

    if (!exam && customExamsMap[examId]) {
      const customInfo = customExamsMap[examId];
      exam = {
        id: examId,
        name: customInfo.name,
        category: customInfo.category,
      };
    }

    if (!exam) return;

    units.push({ kind: 'generic', examId, exam });

    // Durante "Guardar e firmar" (captureTarget === 'order') el documento
    // especializado NO se captura acá: el servidor lo genera de cero con
    // TCPDF (texto vectorial, mismo formato que Laudos — ver
    // api/orders/signed-pdf.php) y lo empalma después de la página genérica
    // capturada de este mismo examen. Para "Imprimir" nativo
    // (captureTarget === null) sí se renderiza acá, como siempre.
    if (SPECIALIZED_EXAM_IDS.has(examId) && captureTarget !== 'order') {
      units.push({ kind: 'specialized', examId });
    }
  });

  return (
    <div
      className="print-area print-area-order"
      style={{
        display: 'none',
        backgroundColor: '#fff',
      }}
    >
      {units.map((u, idx) => {
        const isLast = idx === units.length - 1;

        if (u.kind === 'specialized') {
          return (
            <SpecializedExamDocPages
              key={`spec-${u.examId}-${idx}`}
              examId={u.examId}
              order={order}
              isLastExam={isLast}
            />
          );
        }

        const exam = u.exam;
        const entry: PrintExamEntry = {
          id: exam.id,
          name: exam.name,
          category: exam.category,
          categoryObs: order.examDescriptions?.[exam.category],
        };

        return (
          <PrintPage
            key={`${exam.id}-${idx}`}
            order={order}
            formattedDate={formattedDate}
            entry={entry}
            isLast={isLast}
            verificationQr={captureTarget === 'order' ? verificationQr : null}
            verificationToken={captureTarget === 'order' ? verificationToken : null}
          />
        );
      })}
    </div>
  );
};

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import cerebroLogo from '../assets/cerebro.png';
import type { Order } from '../types';

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
}

const PrintPage: React.FC<PrintPageProps> = ({ order, formattedDate, entry, isLast }) => {
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
          alt="NeuroExámenes"
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

      {/* PATIENT + DATE */}
      <div style={{ marginBottom: '28px', fontSize: '13px', lineHeight: '1.7', color: '#111' }}>
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
          </div>
        )}
        {order.observations && order.observations.trim() && (
          <div style={{ marginTop: '6px' }}>
            <span style={{ fontWeight: 600 }}>{t('print_additional_obs').toUpperCase()}: </span>
            <span style={{ fontStyle: 'italic' }}>{order.observations}</span>
          </div>
        )}
      </div>

      {/* SINGLE EXAM FOR THIS PAGE */}
      <div style={{ marginBottom: '32px', minHeight: '300px' }}>
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
              <p style={{
                margin: 0,
                fontSize: '11.5px',
                color: '#374151',
                fontStyle: 'italic',
                lineHeight: '1.45',
              }}>
                {entry.categoryObs}
              </p>
            </div>
          )}
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
        alignItems: 'flex-end',
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

        {/* Signature block */}
        <div style={{ textAlign: 'center', minWidth: '220px' }}>
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
        </div>
      </div>

    </div>
  );
};

export const PrintTemplate: React.FC = () => {
  const { selectedOrderForPrint, exams } = useApp();

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

  // One entry per individually requested exam — each prints on its own page.
  const examEntries: PrintExamEntry[] = [];

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

    examEntries.push({
      id: exam.id,
      name: exam.name,
      category: exam.category,
      categoryObs: order.examDescriptions?.[exam.category],
    });
  });

  return (
    <div
      className="print-area print-area-order"
      style={{
        display: 'none',
        backgroundColor: '#fff',
      }}
    >
      {examEntries.map((entry, idx) => (
        <PrintPage
          key={`${entry.id}-${idx}`}
          order={order}
          formattedDate={formattedDate}
          entry={entry}
          isLast={idx === examEntries.length - 1}
        />
      ))}
    </div>
  );
};

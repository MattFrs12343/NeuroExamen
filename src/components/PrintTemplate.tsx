import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import cerebroLogo from '../assets/cerebro.png';

export const PrintTemplate: React.FC = () => {
  const { t } = useTranslation();
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

  // Group selected exams by category preserving selection order
  const groupedExams: { category: string; categoryTitle?: string; items: { id: string; name: string; category: string }[] }[] = [];
  const seen: string[] = [];

  order.exams.forEach((examId) => {
    let exam = exams.find(e => e.id === examId);
    let categoryTitle = '';
    
    if (!exam && customExamsMap[examId]) {
      const customInfo = customExamsMap[examId];
      exam = {
        id: examId,
        name: customInfo.name,
        category: customInfo.category,
      };
      categoryTitle = customInfo.categoryTitle || '';
    }

    if (!exam) return;

    if (!seen.includes(exam.category)) {
      seen.push(exam.category);
      groupedExams.push({
        category: exam.category,
        categoryTitle: categoryTitle || undefined,
        items: []
      });
    }
    groupedExams.find(g => g.category === exam.category)!.items.push(exam);
  });

  const BLUE = '#0066CC';
  const GRAY = '#555555';
  const BLACK = '#000000';

  return (
    <div
      className="print-area"
      style={{
        display: 'none',
        fontFamily: 'Inter, Arial, sans-serif',
        backgroundColor: '#fff',
        color: BLACK,
        padding: '20mm 22mm',
        boxSizing: 'border-box',
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

      {/* EXAMS LIST */}
      <div style={{ marginBottom: '32px', minHeight: '300px' }}>
        {groupedExams.map(({ category, items }) => {
          const categoryObs = order.examDescriptions?.[category];
          return (
            <div key={category} style={{ marginBottom: '20px' }}>
              {items.map((exam) => (
                <div
                  key={exam.id}
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
                    {t(exam.name)}
                  </p>
                </div>
              ))}

              {/* Category observations indented */}
              {categoryObs && categoryObs.trim() && (
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
                    {categoryObs}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* General observations — now shown in patient block above */}
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

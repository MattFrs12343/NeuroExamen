import React from 'react';
import { useApp } from '../context/AppContext';
import { DOCTOR_NAME, DOCTOR_CRM, DOCTOR_ADDRESS } from '../lib/doctor';

// ── Paleta del documento de referencia ───────────────────────────────────────
// Negro/blanco puros con grises bajos: estética limpia y minimalista.
const INK     = '#111111';   // texto principal — casi negro
const MUTED   = '#6B7280';   // gris secundario bajo
const FAINT   = '#9CA3AF';   // gris muy tenue (etiquetas secundarias)
const LINE    = '#E5E7EB';   // línea divisoria gris muy claro

// ── Etiqueta de campo del encabezado ─────────────────────────────────────────
const InfoItem: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div style={{ minWidth: 0 }}>
    <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: FAINT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</p>
    <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 600, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '\u00A0'}</p>
  </div>
);

export const PrintAtestadoTemplate: React.FC = () => {
  const { selectedAtestadoForPrint } = useApp();

  if (!selectedAtestadoForPrint) return null;
  const a = selectedAtestadoForPrint;

  const issuedAt     = a.issuedAt || a.signedAt || '';
  const period       = [a.careStartTime, a.careEndTime].filter(Boolean).join(' às ');
  const careDate     = a.careDate || '';
  const restDays     = a.restDays || '';

  return (
    <div className="print-area print-area-atestado" style={{ display: 'none', backgroundColor: '#fff' }}>
      <div style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#fff',
        color: INK,
        padding: '15mm 19mm 16mm',
        boxSizing: 'border-box',
        minHeight: '297mm',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ══ 1. ENCABEZADO — paciente ════════════════════════════════════ */}
        <div>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: FAINT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Paciente
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: 800, color: INK, letterSpacing: '0.01em' }}>
            {(a.patientName || '').toUpperCase()}
          </p>
          <div style={{ width: '46px', height: '3px', backgroundColor: INK, marginTop: '10px', borderRadius: '2px' }} />

          <div style={{ display: 'flex', gap: '34px', marginTop: '16px' }}>
            <InfoItem label="CPF do Paciente" value={a.patientIdentityCard} />
            <InfoItem label="Nascimento" value={a.patientBirthDate} />
            <InfoItem label="Emissão" value={issuedAt} />
          </div>

          {a.patientAddress && (
            <div style={{ marginTop: '16px', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: FAINT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Endereço</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', fontWeight: 500, color: INK, lineHeight: 1.5, overflowWrap: 'break-word' }}>
                {a.patientAddress}
              </p>
            </div>
          )}
        </div>

        {/* ══ 2. LÍNEA DIVISORIA ════════════════════════════════════════════ */}
        <div style={{ marginTop: '22px', height: '1px', backgroundColor: LINE }} />

        {/* ══ 3. TÍTULO ═════════════════════════════════════════════════════ */}
        <div style={{ textAlign: 'center', marginTop: '26px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: INK, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Atestado Médico
          </span>
        </div>

        {/* ══ 4. CONTENIDO MÉDICO ═══════════════════════════════════════════ */}
        <div style={{ marginTop: '28px' }}>
          <p style={{ margin: 0, fontSize: '15px', color: INK }}>
            <span style={{ fontWeight: 700 }}>CID:</span>{' '}
            <span style={{ fontWeight: 800, letterSpacing: '0.02em' }}>{a.cid || ''}</span>
          </p>

          <p style={{ margin: '18px 0 0 0', fontSize: '15px', color: INK, lineHeight: 1.7, textAlign: 'justify' }}>
            Esteve sob cuidados profissionais no período das{' '}
            {period && <span style={{ fontWeight: 700 }}>{period}</span>}
            {careDate && <> do dia {careDate}</>} e Deverá
          </p>
          <p style={{ margin: '10px 0 0 0', fontSize: '15px', color: INK, lineHeight: 1.7, textAlign: 'justify' }}>
            permanecer em repouso a partir de hoje ({careDate}) por{' '}
            <span style={{ fontWeight: 700 }}>{restDays}</span> dia(s).
          </p>
        </div>

        {/* ══ 5. OBSERVACIÓN ═══════════════════════════════════════════════ */}
        {a.observation && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${LINE}` }}>
            <p style={{ margin: 0, fontSize: '15px', color: INK, lineHeight: 1.7, textAlign: 'justify' }}>
              <span style={{ fontWeight: 700 }}>Observação:</span> {a.observation}
            </p>
          </div>
        )}

        {/* ══ 6. ESPACIO BLANCO CENTRAL ═════════════════════════════════════ */}
        <div style={{ flex: 1 }} />

        {/* ══ 7. PIE DE PÁGINA ═════════════════════════════════════════════ */}
        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: '18px' }}>
          <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', fontWeight: 700, color: INK, lineHeight: 1.5 }}>
            {DOCTOR_NAME}
          </p>
          <p style={{ margin: '3px 0 0 0', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: MUTED, lineHeight: 1.4 }}>
            {DOCTOR_CRM}
          </p>
          <p style={{ margin: '4px 0 0 0', textAlign: 'center', fontSize: '11px', color: MUTED, lineHeight: 1.4 }}>
            {DOCTOR_ADDRESS}
          </p>
          <p style={{ margin: '12px 0 0 0', textAlign: 'center', fontSize: '9.5px', color: FAINT, lineHeight: 1.5 }}>
            A exibição do CID no atestado médico foi solicitada pelo paciente (ou representante legal), conforme Art. 5º CFM 1658/02.
          </p>
        </div>
      </div>
    </div>
  );
};
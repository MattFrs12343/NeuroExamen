import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { VerificationQrCard } from './VerificationQrCard';
import { RichText } from './RichText';
import cerebroLogo from '../assets/cerebro.png';

// Degradado azul oscuro (derecha) → azul claro (izquierda) — solo en la onda
// del pie de página (igual que Encaminhamentos); el resto de la hoja es
// blanco. Mismos tonos que usa el resto de la app (#0F4C81 marca, #0A3A63
// variante oscura de hover) más un tercer stop claro para el extremo
// izquierdo.
const DARK = '#0A3A63';
const PRIMARY = '#0F4C81';
const LIGHT = '#6BB3EC';
const BODY = '#1F2937';
const SECONDARY = '#6B7280';
const LINE = '#E2E8F0';

export const PrintReceituarioTemplate: React.FC = () => {
  const { t } = useTranslation();
  const { selectedReceituarioForPrint, captureTarget, verificationQr, verificationToken } = useApp();

  if (!selectedReceituarioForPrint) return null;
  const doc = selectedReceituarioForPrint;
  const isSigning = captureTarget === 'receituario' && !!verificationQr && !!verificationToken;

  const hasClinicData = !!(doc.clinicSecretaria || doc.clinicSistema || doc.clinicAddress || doc.clinicPhone || doc.clinicCnpj);

  const formattedDate = (() => {
    if (!doc.date) return undefined;
    try {
      const [y, m, d] = doc.date.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return doc.date;
    }
  })();

  return (
    <div className="print-area print-area-receituario" style={{ display: 'none', backgroundColor: '#fff' }}>
      {/* Página A4 completa SIEMPRE (297mm, flex-column) — firmando o no: el
          documento tiene que verse estático, como un membrete, con la onda
          anclada al fondo real de la hoja sin importar cuánto texto haya.
          Mismo patrón que ya usa PrintEncaminhamentoTemplate (que imprime
          bien): el spacer flex:1 de abajo empuja el pie (QR + onda) al
          fondo, y el bloque de texto crece hacia abajo con su contenido. */}
      <div style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#fff',
        color: BODY,
        padding: '16mm 18mm 0 18mm',
        boxSizing: 'border-box',
        minHeight: '297mm',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ── ENCABEZADO — logo + clínica ──────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={cerebroLogo} alt="" style={{ width: '26px', height: '26px', objectFit: 'contain', flexShrink: 0 }} />
          <span style={{ fontSize: '15px', fontWeight: 800, color: DARK, lineHeight: 1.3 }}>
            {doc.clinicName || ''}
          </span>
        </div>
        <div style={{ height: '3px', backgroundColor: PRIMARY, marginTop: '10px', marginBottom: '20px', borderRadius: '1px' }} />

        {/* ── ÁREA DE ESCRITA — el recuadro CRECE para llenar toda la hoja
            (flex:1), no importa cuánto texto haya: se ve siempre grande,
            igual que en la versión firmada. Marca d'água do cerebro
            centrada (posição absoluta) e dados da clínica ancorados no
            canto inferior direito, ambos absolutos. ────────────────────── */}
        <div style={{
          flex: 1, border: `1px solid ${LINE}`, borderRadius: '10px',
          padding: '20px 24px 52px 24px',
          minHeight: '70mm', position: 'relative',
          marginBottom: '18px',
        }}>
          <img src={cerebroLogo} alt="" style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', width: '210px', height: '210px',
            objectFit: 'contain', opacity: 0.07, pointerEvents: 'none',
          }} />

          {/* Título decorado — dentro do quadro de escrita, com linhas
              divisórias dos lados (equivalente prolijo do
              "-----TÍTULO-----" pedido). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', position: 'relative' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: LINE }} />
            <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.05em', color: PRIMARY, whiteSpace: 'pre' }}>
              {t('print_receituario_title')}
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: LINE }} />
          </div>

          {/* Paciente (esq.) + Data da Consulta (dir.) — abaixo do título. */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '18px', position: 'relative' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 3px 0', fontSize: '10px', fontWeight: 700, color: SECONDARY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('receituario_patient_name_label')}
              </p>
              <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: BODY, borderBottom: `1px solid ${LINE}`, paddingBottom: '4px' }}>
                {doc.patientName || ' '}
              </p>
            </div>
            <div style={{ minWidth: '150px', textAlign: 'right' }}>
              <p style={{ margin: '0 0 3px 0', fontSize: '10px', fontWeight: 700, color: SECONDARY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('receituario_consult_date_label')}
              </p>
              <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: BODY, borderBottom: `1px solid ${LINE}`, paddingBottom: '4px' }}>
                {formattedDate || ' '}
              </p>
            </div>
          </div>

          <RichText tag="p" style={{
            margin: 0, fontSize: '14px', color: BODY, lineHeight: 1.7,
            whiteSpace: 'pre-wrap', overflowWrap: 'break-word', position: 'relative',
          }} html={doc.content} />

          {hasClinicData && (
            <div style={{ position: 'absolute', bottom: '16px', right: '20px', textAlign: 'right', maxWidth: '55%' }}>
              {doc.clinicSecretaria && <p style={{ margin: '0 0 2px 0', fontSize: '10px', fontWeight: 700, color: BODY }}>{doc.clinicSecretaria}</p>}
              {doc.clinicSistema && <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: 700, color: BODY }}>{doc.clinicSistema}</p>}
              {doc.clinicAddress && <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: SECONDARY, whiteSpace: 'pre-line' }}>{doc.clinicAddress}</p>}
              {doc.clinicPhone && <p style={{ margin: '0 0 2px 0', fontSize: '9px', color: SECONDARY }}><strong>{t('receta_clinic_phone_label')}:</strong> {doc.clinicPhone}</p>}
              {doc.clinicCnpj && <p style={{ margin: 0, fontSize: '9px', color: SECONDARY }}><strong>CNPJ:</strong> {doc.clinicCnpj}</p>}
            </div>
          )}
        </div>

        {/* ── QR de verificação — FORA do recuadro, canto inferior esquerdo,
            entre a caixa de texto e a onda. Só aparece ao assinar. */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '40px' }}>
          {isSigning && (
            <VerificationQrCard qrContent={verificationQr!} token={verificationToken!} size="mini" />
          )}
        </div>

        {/* ── ONDA DECORATIVA — más alta (80px) y con bleed a todo el ancho real
            de la hoja (cancela el padding lateral de 18mm del contenedor). ── */}
        <div style={{ margin: '0 -18mm' }}>
          <svg viewBox="0 0 500 44" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '80px' }}>
            <defs>
              <linearGradient id="onda-receituario" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={LIGHT} />
                <stop offset="55%" stopColor={PRIMARY} />
                <stop offset="100%" stopColor={DARK} />
              </linearGradient>
            </defs>
            <path d="M0,14 C70,36 170,4 270,18 C360,30 430,6 500,16 L500,44 L0,44 Z" fill="url(#onda-receituario)" />
          </svg>
        </div>
      </div>
    </div>
  );
};

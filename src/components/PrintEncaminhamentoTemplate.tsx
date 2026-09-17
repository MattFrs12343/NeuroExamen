import React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { QrCodeSvg } from './QrCodeSvg';
import { VerificationQrCard } from './VerificationQrCard';
import { RichText } from './RichText';
import { getEncProfile } from '../data/encaminhamentoProfiles';

// ── Isotipo médico — cerebro en línea fina ─────────────────────────────────
const WhatsAppIcon: React.FC<{ size?: number; color?: string }> = ({ size = 12, color = '#5146B8' }) => (
  <svg viewBox="0 0 448 512" width={size} height={size} fill={color}>
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
  </svg>
);

const EmailIcon: React.FC<{ size?: number; color?: string }> = ({ size = 12, color = '#6E6E85' }) => (
  <svg viewBox="0 0 512 512" width={size} height={size} fill={color}>
    <path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4 0-26.5-21.5-48-48-48H48zM0 176V384c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V176L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z" />
  </svg>
);

// Línea de formulario médico: etiqueta + línea inferior fina donde se escribe el valor.
const FieldLine: React.FC<{ label: string; value?: string; flex?: number; lineColor?: string; secondary?: string; body?: string }> = ({ label, value, flex, lineColor, secondary, body }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flex: flex ?? 1, minWidth: 0 }}>
    <span style={{ fontSize: '10.5px', fontWeight: 600, color: secondary, whiteSpace: 'nowrap' }}>{label}</span>
    <span style={{
      flex: 1, minWidth: 0, borderBottom: `1px solid ${lineColor}`,
      fontSize: '11.5px', fontWeight: 600, color: body, lineHeight: '1.5', paddingBottom: '1px',
    }}>
      {value || '\u00A0'}
    </span>
  </div>
);

export const PrintEncaminhamentoTemplate: React.FC = () => {
  const { t } = useTranslation();
  const { selectedEncaminhamentoForPrint, specialistsCatalog, captureTarget, verificationQr, verificationToken } = useApp();

  if (!selectedEncaminhamentoForPrint) return null;
  const enc = selectedEncaminhamentoForPrint;

  // Solo true durante la captura de firma (fuera de pantalla). En NeuroMóbius
  // se usa para intercambiar el pie de contactos+QR decorativo por el pie de
  // firma limpio (QR de verificación + texto legal), sin tocar en absoluto la
  // vista/impresión normal del usuario — que sigue mostrando los contactos.
  const isSigning = captureTarget === 'encaminhamento' && !!verificationQr && !!verificationToken;

  // Perfil de clínica → colores, logo, contactos y variante de encabezado.
  const p = getEncProfile(enc.templateId);
  const DARK          = p.printDark;
  const PRIMARY       = p.printPrimary;
  const SURFACE       = p.printSurface;
  const SURFACE_BORDER = p.printSurfaceBorder;
  const LINE          = p.printLine;
  const BODY          = p.printBody;
  const SECONDARY     = p.printSecondary;
  const MUTED         = p.printMuted;

  const formattedDate = (() => {
    if (!enc.date) return null;
    try {
      const [y, m, d] = enc.date.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return enc.date;
    }
  })();

  return (
    <div className="print-area print-area-encaminhamento" style={{ display: 'none', backgroundColor: '#fff' }}>
      <div style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#fff',
        color: BODY,
        padding: '18mm 20mm 0 20mm',
        boxSizing: 'border-box',
        minHeight: '297mm',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ── 1. HEADER INSTITUCIONAL ─────────────────────────────────────── */}
        {p.printHeaderVariant === 'gradient' ? (
          <div style={{
            backgroundImage: `linear-gradient(100deg, ${p.gradientFrom}, ${p.gradientTo})`,
            borderRadius: '12px', padding: '16px 22px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '50%', flexShrink: 0,
                overflow: 'hidden', backgroundColor: '#fff',
              }}>
                <img src={p.mainLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ width: '1px', height: '38px', backgroundColor: 'rgba(255,255,255,0.45)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {p.headerSpecialties.map(s => (
                  <span key={s} style={{ fontSize: '6.8px', fontWeight: 600, letterSpacing: '0.06em', color: '#fff', whiteSpace: 'nowrap' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            {p.headerRightLogo && (
              <img src={p.logo} alt={p.logoAlt} style={{ height: '34px', width: 'auto', objectFit: 'contain', display: 'block' }} />
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Izquierda: isotipo médico + línea vertical + especialidades */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0,
                overflow: 'hidden', backgroundColor: '#fff',
              }}>
                <img src={p.mainLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div style={{ width: '1px', height: '42px', backgroundColor: SURFACE_BORDER }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {p.headerSpecialties.map(s => (
                  <span key={s} style={{ fontSize: '6.8px', fontWeight: 600, letterSpacing: '0.06em', color: SECONDARY, whiteSpace: 'nowrap' }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Derecha: logotipo institucional */}
            {p.headerRightLogo && (
              <div style={{ paddingTop: '4px' }}>
                <img src={p.logo} alt={p.logoAlt} style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block' }} />
              </div>
            )}
          </div>
        )}

        {/* ── 2. TÍTULO PRINCIPAL ─────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: '36px', marginBottom: '30px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: DARK }}>
            {t('print_encaminhamento_title')}
          </span>
        </div>

        {/* ── 3. BLOQUE DE ESPECIALISTAS ──────────────────────────────────── */}
        <div style={{
          backgroundColor: SURFACE, border: `1px solid ${SURFACE_BORDER}`,
          borderRadius: '10px', padding: '18px 24px', marginBottom: '34px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '28px', rowGap: '12px', alignItems: 'start' }}>
            {specialistsCatalog.map(s => {
              const checked = enc.specialists.includes(s.id);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', minWidth: 0 }}>
                  <div style={{
                    flexShrink: 0, width: '14px', height: '14px', borderRadius: '3px', marginTop: '1.5px',
                    border: `1.3px solid ${checked ? PRIMARY : SURFACE_BORDER}`,
                    backgroundColor: checked ? PRIMARY : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && (
                      <svg viewBox="0 0 10 10" style={{ width: '8px', height: '8px' }} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1.5,5.5 4,8 8.5,2" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: BODY, fontWeight: 500, lineHeight: 1.35, overflowWrap: 'break-word' }}>{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. INFORMACIÓN DEL PACIENTE + HD ────────────────────────────── */}
        <div style={{ display: 'flex', gap: '30px' }}>
          <FieldLine label={t('print_encaminhamento_name_label')} value={enc.patientName} flex={3} lineColor={LINE} secondary={SECONDARY} body={BODY} />
          <FieldLine label={t('print_encaminhamento_age_label')} value={enc.patientAge} flex={1} lineColor={LINE} secondary={SECONDARY} body={BODY} />
        </div>
        {enc.clinicName && enc.clinicName.trim() && (
          <div style={{ marginTop: '16px' }}>
            <FieldLine label={t('print_clinic_label')} value={enc.clinicName} lineColor={LINE} secondary={SECONDARY} body={BODY} />
          </div>
        )}
        <div style={{ marginTop: '16px' }}>
          <FieldLine label={t('print_encaminhamento_hd_label')} value={enc.hd} lineColor={LINE} secondary={SECONDARY} body={BODY} />
        </div>

        {/* ── 5. TEXTO EXPLICATIVO ────────────────────────────────────────── */}
        <p style={{ margin: '30px 0 14px 0', fontSize: '11.5px', color: '#3B3B46', lineHeight: 1.6 }}>
          {t('print_encaminhamento_intro')}
        </p>

        {/* ── 6. ÁREA GRANDE DE ENCAMINHAMENTO ────────────────────────────── */}
        <div style={{
          border: `1px solid ${LINE}`, borderRadius: '8px', backgroundColor: '#fff',
          minHeight: '170px', padding: '14px 16px', marginBottom: '30px',
        }}>
          <RichText tag="p" style={{ margin: 0, fontSize: '11.5px', color: BODY, lineHeight: 1.7, whiteSpace: 'pre-wrap' }} html={enc.motivo || ''} />
        </div>

        {/* ── 7. FECHA + FIRMA — anclados al pie con espacio amplio ───────── */}
        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          {/* Fecha — izquierda */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: BODY }}>{formattedDate || '___/___/___'}</span>
            <div style={{ borderBottom: `1px solid ${LINE}`, width: '112px', marginTop: '6px' }} />
          </div>

          {/* Firma — derecha */}
          <div style={{ textAlign: 'center', width: '320px' }}>
            <div style={{ borderBottom: `1.5px solid ${DARK}`, marginBottom: '8px', height: '22px' }} />
            <p style={{ margin: 0, fontSize: '9.5px', color: SECONDARY, letterSpacing: '0.04em' }}>
              {t('print_encaminhamento_signature')}
            </p>
          </div>
        </div>

        {/* ── 8. FOOTER INSTITUCIONAL ─────────────────────────────────────── */}
        <div style={{ marginTop: '34px' }}>
          {/* Contactos + QR decorativo del WhatsApp: solo en la vista/impresión
              normal. Durante la firma (isSigning) se ocultan para dejar libre
              el pie — así el QR de verificación (derecha) y el texto legal
              ICP-Brasil (izquierda, dibujado por el servidor) no se pisan con
              ellos. NeuroIsbe ya tiene footerContacts:false, así que esto solo
              afecta a NeuroMóbius. */}
          {p.footerContacts && !isSigning && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '18px' }}>
            {/* Contactos — izquierda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${SURFACE_BORDER}`, backgroundColor: SURFACE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <WhatsAppIcon size={15} color={PRIMARY} />
                </div>
                <span style={{ fontSize: '15px', fontWeight: 800, color: BODY, letterSpacing: '0.02em' }}>{p.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${SURFACE_BORDER}`, backgroundColor: SURFACE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <EmailIcon size={15} color={SECONDARY} />
                </div>
                <span style={{ fontSize: '12.5px', color: SECONDARY }}>{p.email}</span>
              </div>
            </div>

            {/* QR — derecha */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ border: `1px solid ${SURFACE_BORDER}`, borderRadius: '8px', padding: '8px', backgroundColor: SURFACE, display: 'inline-block' }}>
                <QrCodeSvg value={p.whatsappUrl} size={62} dark={p.printQrDark} light={SURFACE} />
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '7.5px', color: MUTED, maxWidth: '118px', lineHeight: 1.35 }}>
                {t('print_encaminhamento_qr_caption')}
              </p>
            </div>
          </div>
          )}

          {/* QR de verificação (só ao assinar) — ocupa el lugar del pie que
              acaba de liberarse (contactos/QR decorativo ocultos por isSigning
              en NeuroMóbius; NeuroIsbe nunca los tuvo). */}
          {isSigning && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '18px' }}>
              <VerificationQrCard qrContent={verificationQr!} token={verificationToken!} size="compact"
                dark={p.printQrDark} surface={SURFACE} surfaceBorder={SURFACE_BORDER} accent={PRIMARY} />
            </div>
          )}

          {/* ── 9. ONDA DECORATIVA — degradado del perfil ─────────────────── */}
          <div style={{ margin: '0 -20mm' }}>
            <svg viewBox="0 0 500 44" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '44px' }}>
              <defs>
                <linearGradient id="onda-enc" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={p.gradientFrom} />
                  <stop offset="60%" stopColor={p.gradientMid} />
                  <stop offset="100%" stopColor={p.gradientTo} />
                </linearGradient>
              </defs>
              <path d="M0,14 C70,36 170,4 270,18 C360,30 430,6 500,16 L500,44 L0,44 Z" fill="url(#onda-enc)" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
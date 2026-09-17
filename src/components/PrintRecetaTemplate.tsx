import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { findClinicProfile } from '../lib/clinic';
import cerebroLogo from '../assets/cerebro.png';
import { VerificationQrCard } from './VerificationQrCard';
import { RichText } from './RichText';

const BLUE = '#0066CC';
const GRAY = '#555555';
const BLACK = '#000000';

const Field: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div style={{ marginBottom: '10px' }}>
    <span style={{ fontSize: '9px', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {label}:{' '}
    </span>
    <span style={{
      fontSize: '11px', color: BLACK, fontWeight: value ? 600 : 400,
      borderBottom: '1px solid #D1D5DB', paddingBottom: '2px', display: 'inline-block', minWidth: '140px',
    }}>
      {value || ' '}
    </span>
  </div>
);

const ViaLabel: React.FC<{ label: string }> = ({ label }) => (
  <p style={{ margin: '0 0 6px 0', fontSize: '9.5px', fontWeight: 600, color: BLACK }}>{label}</p>
);

export const PrintRecetaTemplate: React.FC = () => {
  const { t } = useTranslation();
  const { selectedRecetaForPrint, recetaPrintCopies, clinicProfiles, captureTarget, verificationQr, verificationToken } = useApp();

  // Fallback al perfil actual de la clínica: si la receta se guardó con un
  // nombre que no tenía perfil (o antes de que existiera), recuperamos en la
  // impresión la secretaría/sistema/dirección/teléfono/CNPJ cuando haya match.
  // Debe llamarse siempre (antes de cualquier return) para no violar las
  // Rules of Hooks — un useMemo condicional causaba "Rendered more hooks
  // than during the previous render" y tumbaba toda la app al imprimir.
  const profile = useMemo(
    () => findClinicProfile(clinicProfiles, selectedRecetaForPrint?.clinicName),
    [clinicProfiles, selectedRecetaForPrint]
  );

  if (!selectedRecetaForPrint) return null;
  const receta = selectedRecetaForPrint;
  const clinicSecretaria = receta.clinicSecretaria || profile?.secretaria;
  const clinicSistema    = receta.clinicSistema    || profile?.sistema;
  const clinicAddress    = receta.clinicAddress    || profile?.address;
  const clinicPhone      = receta.clinicPhone      || profile?.phone;
  const clinicCnpj       = receta.clinicCnpj       || profile?.cnpj;

  const formattedDate = (() => {
    if (!receta.date) return undefined;
    try {
      const [y, m, d] = receta.date.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return receta.date;
    }
  })();

  return (
    <div className="print-area print-area-receta" style={{ display: 'none', backgroundColor: '#fff' }}>
      {Array.from({ length: recetaPrintCopies }).map((_, pageIdx) => (
      <div key={pageIdx} style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#fff',
        color: BLACK,
        padding: '16mm 18mm',
        boxSizing: 'border-box',
        // breakAfter (estándar) + pageBreakAfter (legacy): el motor de
        // impresión de Chrome (window.print()) ignora break-after en
        // ciertos casos cuando el elemento es display:flex — pageBreakAfter
        // es la propiedad que realmente respeta al paginar, se agrega como
        // refuerzo sin sacar breakAfter (pantalla/otros navegadores).
        breakAfter: pageIdx < recetaPrintCopies - 1 ? 'page' : 'auto',
        pageBreakAfter: pageIdx < recetaPrintCopies - 1 ? 'always' : 'auto',
        // display:flex + el spacer de abajo (antes del bloque QR/firma) solo
        // importan durante la captura de firma: ahí body.capturing-receta
        // fuerza min-height:297mm (ver index.css) y el spacer empuja el
        // bloque QR/firma siempre al fondo real de la hoja — así el texto
        // legal ICP-Brasil que agrega el servidor después (a una distancia
        // FIJA del borde inferior) cae siempre en el mismo lugar, sin
        // importar si la receta tiene pocos o muchos medicamentos. En
        // impresión normal (sin min-height forzado) el spacer no hace nada,
        // el diseño se ve exactamente igual que siempre.
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* LOGO + TITLE */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <img src={cerebroLogo} alt="NeuroExámenes" style={{ width: '56px', height: '56px', objectFit: 'contain', display: 'inline-block' }} />
        </div>
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: BLUE }}>
            {t('print_receta_title')}
          </span>
        </div>
        <div style={{ height: '3px', backgroundColor: BLUE, marginBottom: '16px', borderRadius: '1px' }} />

        {/* EMISOR + VIAS */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', gap: '16px',
          border: '1px solid #D1D5DB', borderRadius: '6px', padding: '12px 14px', marginBottom: '14px',
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '9px', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('print_receta_emitter')}
            </p>
            {receta.clinicName && (
              <p style={{ margin: '0 0 3px 0', fontSize: '12px', fontWeight: 800, color: BLACK }}>{receta.clinicName}</p>
            )}
            {clinicSecretaria && (
              <p style={{ margin: '0 0 2px 0', fontSize: '10.5px', fontWeight: 700, color: BLACK }}>{clinicSecretaria}</p>
            )}
            {clinicSistema && (
              <p style={{ margin: '0 0 4px 0', fontSize: '10.5px', fontWeight: 700, color: BLACK }}>{clinicSistema}</p>
            )}
            {clinicAddress && <p style={{ margin: '0 0 2px 0', fontSize: '10px', color: '#374151', whiteSpace: 'pre-line' }}>{clinicAddress}</p>}
            <div style={{ display: 'flex', gap: '14px', marginTop: '4px' }}>
              {clinicPhone && (
                <span style={{ fontSize: '10px', color: '#374151', whiteSpace: 'pre-line' }}>
                  <strong>{t('receta_clinic_phone_label')}:</strong> {clinicPhone}
                </span>
              )}
              {clinicCnpj && (
                <span style={{ fontSize: '10px', color: '#374151' }}><strong>CNPJ:</strong> {clinicCnpj}</span>
              )}
            </div>
          </div>
          <div style={{ minWidth: '190px', borderLeft: '1px solid #E5E7EB', paddingLeft: '14px' }}>
            <ViaLabel label={t('print_receta_via1')} />
            <ViaLabel label={t('print_receta_via2')} />
          </div>
        </div>

        {/* PACIENTE + FECHA */}
        <div style={{ marginBottom: '14px', fontSize: '12px' }}>
          <Field label={t('print_pat_info')} value={receta.patientName.toUpperCase()} />
          <div style={{ display: 'flex', gap: '24px' }}>
            <Field label={t('print_issue_date')} value={formattedDate} />
            {receta.patientAddress && <Field label={t('print_receta_address')} value={receta.patientAddress} />}
            {receta.patientCpf && <Field label={t('print_receta_cpf')} value={receta.patientCpf} />}
          </div>
        </div>

        {/* PRESCRIÇÃO */}
        <div style={{ marginBottom: '14px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '9px', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t('print_receta_med_table_med')}
          </p>
          <div style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '4px 0' }}>
            {receta.medications.map((m, idx) => (
              <div key={m.id} style={{
                display: 'flex', gap: '10px', padding: '8px 12px',
                borderBottom: idx === receta.medications.length - 1 ? 'none' : '1px solid #E5E7EB',
              }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: BLUE, flexShrink: 0 }}>{idx + 1}.</span>
                <RichText tag="p" style={{ margin: 0, fontSize: '11.5px', color: BLACK, lineHeight: '1.5', whiteSpace: 'pre-wrap' }} html={m.text} />
              </div>
            ))}
          </div>
        </div>

        {receta.observations && (
          <div style={{ marginBottom: '18px' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '9px', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('print_additional_obs')}
            </p>
            <RichText tag="p" style={{ margin: 0, fontSize: '11px', fontStyle: 'italic', color: '#111' }} html={receta.observations} />
          </div>
        )}

        {/* IDENTIFICACIÓN PACIENTE + PROVEEDOR */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
          <div style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: '6px', padding: '12px 14px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '9px', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('print_receta_patient_block')}
            </p>
            {/* Se completa a mano al momento de la dispensación — el documento (CPF) sí se precarga desde el formulario. */}
            <Field label={t('print_pat_info')} value={receta.patientName.toUpperCase()} />
            <Field label={t('print_receta_ident')} value={receta.patientCpf} />
            <Field label={t('print_receta_org_emissor')} />
            <Field label={t('print_receta_address')} />
            <div style={{ display: 'flex', gap: '18px' }}>
              <Field label={t('print_receta_city')} />
              <Field label={t('print_receta_uf')} />
            </div>
          </div>
          <div style={{ flex: 1, border: '1px solid #D1D5DB', borderRadius: '6px', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '9px', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('print_receta_supplier_block')}
            </p>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ borderBottom: '1px solid #000', marginBottom: '6px', height: '28px' }} />
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {t('print_receta_pharma_sig')} — {t('date')}: ___/___/______
              </p>
            </div>
          </div>
        </div>

        {/* Empuja el bloque QR/firma al fondo real de la hoja cuando la
            página está forzada a 297mm (solo durante la captura de firma —
            ver comentario en el div de la página, arriba). En impresión
            normal se colapsa a 0 y no afecta nada. */}
        <div style={{ flex: 1 }} />

        {/* QR de verificação (só ao assinar) + FIRMA MÉDICO — al firmar, la
            línea en blanco "Assinatura e Carimbo do Médico" se saca del
            todo: el servidor dibuja ahí mismo (abajo a la derecha, caja
            angosta) el texto legal ICP-Brasil real (firmante, CNPJ/CPF,
            fecha/hora — drawSignatureFooter en lib/signing.php, con
            footerBoxAlign:'right' para esta sección). En impresión normal
            (sin firmar) la línea en blanco se mantiene igual que siempre. */}
        {(() => {
          const isSigning = captureTarget === 'receta' && !!verificationQr && !!verificationToken;
          return (
            <div style={{ display: 'flex', justifyContent: isSigning ? 'flex-start' : 'flex-end', alignItems: 'flex-end', marginTop: '32px' }}>
              {isSigning ? (
                <VerificationQrCard qrContent={verificationQr!} token={verificationToken!} size="compact" />
              ) : (
                <div style={{ textAlign: 'center', minWidth: '260px' }}>
                  <div style={{ height: '56px' }} />
                  <div style={{ borderBottom: '2px solid #000', marginBottom: '8px', width: '100%' }} />
                  <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('print_sign_label')}
                  </p>
                </div>
              )}
            </div>
          );
        })()}
      </div>
      ))}
    </div>
  );
};

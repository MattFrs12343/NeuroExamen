import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DOCTOR_NAME, DOCTOR_CRM, DOCTOR_ADDRESS } from '../lib/doctor';
import { isoToBRDate, isoToBRDateTime } from '../lib/dates';
import { findClinicProfile } from '../lib/clinic';
import { RichText } from './RichText';
import { isRichTextEmpty } from '../lib/richText';

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
  const { selectedAtestadoForPrint, clinicProfiles } = useApp();

  // Fallback al perfil actual de la clínica: si el atestado se guardó con un
  // nombre que no tenía perfil (o antes de que existiera), recuperamos en la
  // impresión la secretaría/sistema/dirección/teléfono/CNPJ cuando haya match.
  // Debe llamarse siempre (antes de cualquier return) para no violar las
  // Rules of Hooks — un useMemo condicional causaba "Rendered more hooks
  // than during the previous render" y tumbaba toda la app al imprimir.
  const profile = useMemo(
    () => findClinicProfile(clinicProfiles, selectedAtestadoForPrint?.clinicName),
    [clinicProfiles, selectedAtestadoForPrint]
  );

  if (!selectedAtestadoForPrint) return null;
  const a = selectedAtestadoForPrint;

  const clinicSecretaria = a.clinicSecretaria || profile?.secretaria;
  const clinicSistema    = a.clinicSistema    || profile?.sistema;
  const clinicAddress    = a.clinicAddress    || profile?.address;
  const clinicPhone      = a.clinicPhone      || profile?.phone;
  const clinicCnpj       = a.clinicCnpj       || profile?.cnpj;

  const issuedAt     = isoToBRDateTime(a.issuedAt || a.signedAt || '');
  const period       = [a.careStartTime, a.careEndTime].filter(Boolean).join(' às ');
  const careDate     = isoToBRDate(a.careDate || '');
  const restDays     = a.restDays || '';

  const hasClinic = !!(a.clinicName || clinicSecretaria || clinicSistema || clinicAddress || clinicPhone || clinicCnpj);

  return (
    <div className="print-area print-area-atestado" style={{ display: 'none', backgroundColor: '#fff' }}>
      <div style={{
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#fff',
        color: INK,
        // @page { margin: 0 } en index.css hace que este padding sea la
        // única fuente de margen de la hoja impresa. El borde se dibuja
        // justo en el límite del padding — un marco rectangular VISIBLE que
        // marca dónde está el margen, en vez de dejarlo como espacio en
        // blanco que puede pasar desapercibido.
        padding: '18mm 20mm 16mm',
        border: `0.5mm solid ${INK}`,
        margin: '10mm 10mm 8mm',
        boxSizing: 'border-box',
        minHeight: '279mm',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* ══ 1. EMISOR — CLÍNICA ════════════════════════════════════════ */}
        {hasClinic && (
          <div style={{ marginBottom: '20px', paddingBottom: '18px', borderBottom: `1px solid ${LINE}` }}>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: FAINT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Identificação do Emissor
            </p>
            {a.clinicName && (
              <p style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 800, color: INK, letterSpacing: '0.01em' }}>
                {(a.clinicName || '').toUpperCase()}
              </p>
            )}
            {(clinicSecretaria || clinicSistema) && (
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', fontWeight: 600, color: MUTED }}>
                {[clinicSecretaria, clinicSistema].filter(Boolean).join(' — ')}
              </p>
            )}
            {clinicAddress && (
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: MUTED, lineHeight: 1.2, whiteSpace: 'pre-line' }}>
                {clinicAddress}
              </p>
            )}
            {(clinicPhone || clinicCnpj) && (
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: MUTED }}>
                {[clinicPhone ? `Tel: ${clinicPhone}` : '', clinicCnpj ? `CNPJ: ${clinicCnpj}` : ''].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}

        {/* ══ 2. ENCABEZADO — paciente ════════════════════════════════════ */}
        <div>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: FAINT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Paciente
          </p>
          {/* display:inline-block hace que el ancho de la caja sea el del
              texto renderizado, no el de la columna — el border-bottom
              (la "barra de acento") queda calzado con el nombre real en vez
              de un ancho fijo que quedaba corto o largo de más. */}
          <p style={{
            display: 'inline-block', margin: '4px 0 0 0', fontSize: '22px', fontWeight: 800,
            color: INK, letterSpacing: '0.01em', paddingBottom: '9px', borderBottom: `3px solid ${INK}`,
          }}>
            {(a.patientName || '').toUpperCase()}
          </p>

          <div style={{ display: 'flex', gap: '34px', marginTop: '16px' }}>
            <InfoItem label="CPF do Paciente" value={a.patientIdentityCard} />
            <InfoItem label="Nascimento" value={a.patientBirthDate} />
            <InfoItem label="Emissão" value={issuedAt} />
          </div>

          {a.patientAddress && (
            <div style={{ marginTop: '16px', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: FAINT, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Endereço</p>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', fontWeight: 500, color: INK, lineHeight: 1.2, overflowWrap: 'break-word' }}>
                {a.patientAddress}
              </p>
            </div>
          )}
        </div>

        {/* ══ 3. LÍNEA DIVISORIA — entre el encabezado (paciente) y el título ══ */}
        <div style={{ marginTop: '22px', borderTop: `1.5px solid ${INK}` }} />

        {/* ══ 4. TÍTULO ═════════════════════════════════════════════════════ */}
        <div style={{ textAlign: 'center', marginTop: '26px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800, color: INK, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Atestado Médico
          </span>
        </div>

        {/* ══ 5. CONTENIDO MÉDICO ═══════════════════════════════════════════ */}
        <div style={{ marginTop: '28px' }}>
          {/* Mismo patrón etiqueta chica + valor grande que CPF/Nascimento/
              Emissão arriba y que la versión firmada — un dato más, no una
              oración con otro estilo. */}
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 700, color: FAINT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>CID</p>
          <p style={{ margin: '3px 0 0 0', fontSize: '18px', fontWeight: 800, color: INK }}>{a.cid || ''}</p>

          {/* Dos oraciones independientes: si falta el horário (período) o
              los días de repouso, no queda un hueco vacío en medio de la
              frase ("no período das  do dia..." / "por  dia(s)."). La
              segunda oración se omite directamente si no hay días cargados. */}
          <p style={{ margin: '18px 0 0 0', fontSize: '15px', color: INK, lineHeight: 1.3, textAlign: 'justify' }}>
            Esteve sob cuidados profissionais
            {period && <> no período das <span style={{ fontWeight: 700 }}>{period}</span></>}
            {careDate && <>{period ? ' do dia ' : ' no dia '}{careDate}</>}.
          </p>
          {restDays && (
            <p style={{ margin: '10px 0 0 0', fontSize: '15px', color: INK, lineHeight: 1.3, textAlign: 'justify' }}>
              Deverá permanecer em repouso a partir de hoje{careDate && <> ({careDate})</>} por{' '}
              <span style={{ fontWeight: 700 }}>{restDays}</span> dia(s).
            </p>
          )}
        </div>

        {/* ══ 6. OBSERVACIÓN ═══════════════════════════════════════════════ */}
        {!isRichTextEmpty(a.observation) && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${LINE}` }}>
            <p style={{ margin: 0, fontSize: '15px', color: INK, lineHeight: 1.3, textAlign: 'justify' }}>
              <span style={{ fontWeight: 700 }}>Observação:</span>
            </p>
            <RichText
              tag="p"
              style={{ margin: '6px 0 0 0', fontSize: '15px', color: INK, lineHeight: 1.3, textAlign: 'justify' }}
              html={a.observation}
            />
          </div>
        )}

        {/* ══ 7. ESPACIO BLANCO CENTRAL ═════════════════════════════════════ */}
        <div style={{ flex: 1 }} />

        {/* ══ 8. PIE DE PÁGINA ═════════════════════════════════════════════ */}
        <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: '18px' }}>
          <p style={{ margin: 0, textAlign: 'center', fontSize: '14px', fontWeight: 700, color: INK, lineHeight: 1.15 }}>
            {DOCTOR_NAME}
          </p>
          <p style={{ margin: '2px 0 0 0', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: MUTED, lineHeight: 1.15 }}>
            {DOCTOR_CRM}
          </p>
          {/* La dirección sigue a la clínica seleccionada (la misma que ya
              se ve arriba, en Identificação do Emissor) — no la dirección
              fija del médico, que quedaba igual sin importar qué clínica
              se eligió. */}
          <p style={{ margin: '2px 0 0 0', textAlign: 'center', fontSize: '11px', color: MUTED, lineHeight: 1.15 }}>
            {clinicAddress || DOCTOR_ADDRESS}
          </p>
          <p style={{ margin: '8px 0 0 0', textAlign: 'center', fontSize: '9.5px', color: FAINT, lineHeight: 1.25 }}>
            A exibição do CID no atestado médico foi solicitada pelo paciente (ou representante legal), conforme Art. 5º CFM 1658/02.
          </p>
        </div>
      </div>
    </div>
  );
};
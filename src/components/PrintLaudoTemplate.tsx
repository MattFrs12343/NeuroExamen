import React, { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../context/AppContext';
import { findLaudoClinicProfile, getLaudoProfileFor } from '../lib/laudoClinic';
import { normalizeClinicKey } from '../lib/clinic';
import { LAUDO_PROFILES } from '../data/laudoProfiles';
import { RichText } from './RichText';
import type { LaudoClinicProfile } from '../types';

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
// se mide el alto real del contenido (en un nodo oculto) y el contenedor se
// estira al múltiplo exacto de 297mm (N páginas). Así un contenido corto
// ocupa una sola página con la firma al fondo, y si sobrepasa, la firma va
// al fondo de la última página en vez de quedar a mitad de hoja. El PDF
// firmado digitalmente sigue siendo de 2 páginas fijas
// (api/laudos/signed-pdf.php), no pasa por acá.
const BODY = '#1F2937';
const SECONDARY = '#6B7280';
const LINE = '#E2E8F0';

const MM = 297;        // alto A4
const PX_PER_MM = 96 / 25.4;  // 1mm = 3.7795px en CSS (96dpi)
const SAFETY_MM = 1.5;        // margen contra redondeos de wrap texto

const checkbox = (checked: boolean) => (
  <span style={{ display: 'inline-block', width: '12px', height: '12px', border: `1px solid ${checked ? '#111827' : '#111827'}`, verticalAlign: 'middle', marginRight: '8px', fontFamily: 'Arial, sans-serif' }}>
    {checked ? <span style={{ display: 'block', textAlign: 'center', lineHeight: '10px', fontSize: '10px', fontWeight: 700, color: '#111827' }}>X</span> : null}
  </span>
);

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
  const [pages, setPages] = useState(1);

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

  const clinicName = doc?.clinicName || profile?.clinicNameFiscal;
  const clinicAddress = doc?.clinicAddress || profile?.clinicAddress;
  const clinicPhone = doc?.clinicPhone || profile?.clinicPhone;
  const doctorName = doc?.doctorName || profile?.doctorName;
  const doctorCrm = doc?.doctorCrm || profile?.doctorCrm;

  // Alto natural del documento (contenido + firma) en mm → número de páginas.
  // El nodo oculto replica el print (mismo ancho A4 y padding) pero sin el
  // estiramiento flex, para medir la altura real sin tocar el HTML impreso.
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !doc) return;
    const totalMm = el.scrollHeight / PX_PER_MM;
    setPages(Math.max(1, Math.ceil((totalMm + SAFETY_MM) / MM)));
  }, [doc]);

  if (!doc) return null;

  const pageStyle: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    color: BODY,
    padding: '16mm 18mm',
  };

  const contentBlock = (
    <>
      {/* Membrete — logo de la clínica, igual que en Ludos.pdf. Opcional:
          profile.logo puede faltar en clínicas que se agreguen después.
          Ancho FIJO (45mm, misma proporción 262:151 del archivo recortado
          en src/assets/logo-saude-campinas.png a 26mm de alto) en vez de
          width:'auto' — así el centrado no depende de que el navegador ya
          sepa las dimensiones reales de la imagen al maquetar. display:
          block + margin:auto en la propia <img> centra por su cuenta,
          sin depender solo del text-align:center del contenedor. */}
      {profile?.logo && (
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <img src={profile.logo} alt="" style={{ height: '26mm', width: '45mm', display: 'block', margin: '0 auto' }} />
        </div>
      )}
      <p style={{
        margin: '0 0 16px 0',
        textAlign: 'center',
        fontSize: '18px',
        fontWeight: 800,
        letterSpacing: '0.08em',
        color: '#111827',
        borderBottom: `1px solid ${LINE}`,
        paddingBottom: '10px',
        textTransform: 'uppercase',
      }}>
        {t('print_laudo_title')}
      </p>

      {/* Datos del paciente */}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: '6px', padding: '12px 14px', marginBottom: '16px' }}>
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
      </div>

      {/* Base de informações */}
      <p style={{ margin: '0 0 4px 0', fontSize: '12.5px', color: '#111827' }}><strong>{t('print_laudo_base_info_label')}</strong></p>
      <RichText tag="p" style={{ margin: '0 0 14px 0', fontSize: '12.5px', lineHeight: 1.55 }} html={profile?.baseInfo || ''} />

      {/* Declarante + fecha — la fecha va DEBAJO del nombre del paciente,
          no a la derecha (así figura en el PDF emitido por la clínica). */}
      <p style={{ margin: '0 0 2px 0', fontSize: '12.5px' }}>
        {patientLine}
      </p>
      {formattedDate && (
        <p style={{ margin: '0 0 16px 0', fontSize: '12.5px' }}>
          {formattedDate}
        </p>
      )}

      {/* Narrativa */}
      <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: '#111827' }}><strong>{t('print_laudo_ao_perito')}</strong></p>
      <RichText tag="p" style={{ margin: '0 0 14px 0', fontSize: '12.5px', lineHeight: 1.65, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }} html={doc.narrative} />
      <p style={{ margin: '0 0 18px 0', fontSize: '12.5px' }}>{t('print_laudo_grato')}</p>

      <p style={{ margin: '0 0 4px 0', fontSize: '12.5px', color: '#111827' }}>
        <strong>{t('print_laudo_diagnostico_label')} </strong>
        <span>{cids ? `CID: ${cids}` : (diagnostico || ' ')}</span>
      </p>
      {/* Conclusão Pericial — sección opcional: el médico puede dejarla sin
          marcar en el formulario para que no salga en la impresión. */}
      {doc.conclusao && (
        <>
          <p style={{ margin: '0 0 14px 0', fontSize: '12.5px', color: '#111827' }}><strong>{t('print_laudo_conclusao_label')}</strong></p>
          <p style={{ margin: '0 0 8px 0', fontSize: '12.5px', lineHeight: 1.7 }}>
            {checkbox(doc.conclusao === 'apto')}{t('laudo_apto')}
          </p>
          <p style={{ margin: '0 0 8px 0', fontSize: '12.5px', lineHeight: 1.7 }}>
            {checkbox(doc.conclusao === 'inapto_temporario')}{t('laudo_inapto_temporario')}
          </p>
          <p style={{ margin: '0 0 18px 0', fontSize: '12.5px', lineHeight: 1.7 }}>
            {checkbox(doc.conclusao === 'inapto_definitivo')}{t('laudo_inapto_definitivo')}
          </p>
        </>
      )}

      {/* Afastamento — opcional, igual que Conclusão Pericial: si no se
          cargaron días, la sección no sale en la impresión. */}
      {!!doc.afastamentoDias && (
        <>
          <p style={{ margin: '0 0 6px 0', fontSize: '12.5px', color: '#111827' }}>
            <strong>{t('print_laudo_afastamento_label')}</strong>
          </p>
          <p style={{ margin: '0 0 18px 0', fontSize: '12.5px' }}>
            {t('laudo_afastamento_de')} <strong>{doc.afastamentoDias}</strong> {t('laudo_dias')}
          </p>
        </>
      )}

      {/* Observações */}
      <p style={{ margin: '0 0 6px 0', fontSize: '12.5px', color: '#111827' }}>
        <strong>{t('print_laudo_observacoes_label')}</strong>
      </p>
      <RichText tag="p" style={{ margin: '0 0 26px 0', fontSize: '12.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', minHeight: '40px' }} html={doc.observacoes || ' '} />
    </>
  );

  // Local e Data + bloque clínica + firma: todo viaja junto como unidad
  // (break-inside: avoid). Si el contenido desborda a página 2, este bloque
  // completo salta entero a la página 2 en vez de quedar cortado entre hojas.
  const footerBlock = (
    <div style={{ marginTop: '28px', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
      {/* ── Nodo de medición (oculto, no se imprime) — replica el ancho A4 y
          el padding del print sin el estiramiento flex, para medir la altura
          real del contenido + firma. */}
      <div
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: '-99999px',
          visibility: 'hidden',
          width: '210mm',
          ...pageStyle,
        }}
      >
        {contentBlock}
        {footerBlock}
      </div>

      {/* ── Print area — el contenedor se estira al múltiplo de 297mm según la
          medición: la firma queda siempre pegada al fondo de la última página
          (1 si el contenido cabe, 2+ si sobrepasa). */}
      <div className="print-area print-area-laudo" style={{ display: 'none', backgroundColor: '#fff' }}>
        {/* Marca de agua: logo de la clínica al fondo, en CADA página. Como
            position:fixed degenera en el print de Chromium (matriz 0) cuando
            el padre pasa de display:none a block, se renderizan N capas
            absolutas (una por página, tamaño conocido = MM×297mm) ancladas al
            contenedor. Solo cuando la clínica tiene logo (hoy únicamente
            CLINICA SAUDE CAMINAS). */}
        {profile?.logo
          ? Array.from({ length: pages }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                style={{
                  position: 'absolute',
                  top: `${i * MM}mm`,
                  left: 0,
                  width: '210mm',
                  height: `${MM}mm`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              >
                <img
                  src={profile.logo!}
                  alt=""
                  style={{ width: '140mm', height: 'auto', opacity: 0.07 }}
                />
              </div>
            ))
          : null}
        <div style={{ ...pageStyle, backgroundColor: 'transparent', minHeight: `${pages * MM}mm`, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
          <div style={{ flex: 1 }}>{contentBlock}</div>
          {footerBlock}
        </div>
      </div>
    </>
  );
};
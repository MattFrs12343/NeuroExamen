import React from 'react';
import { useApp } from '../context/AppContext';
import {
  SYMPTOM_CATEGORY_LABELS, EXAM_CATEGORY_LABELS,
} from '../data/formulaLeiteCatalog';
import type { SymptomEntry, ExamEntry } from '../types';
import { isoToBRDate } from '../lib/dates';
import { RichText } from './RichText';

// ── Réplica fiel de la grilla del PDF original ──────────────────────────────
// A diferencia de las demás plantillas (estilo prosa libre), esta reproduce
// las tablas reales del formulario "FORMULAS INFANTIS ESPECIAIS — FICHA DE
// AVALIAÇÃO PARA FORNECIMENTO" con bordes, encabezados de categoría y
// checkboxes "( )" — todo el texto y la puntuación son los del PDF original
// (transcripción literal), no pasa por i18n.
//
// Las tablas B) y C) suman ~42 filas entre las dos — para que las 2 páginas
// impresas coincidan con el PDF original (2 hojas), esas filas usan un
// tamaño compacto (padding/línea ajustados). Las secciones de texto libre
// (A, D, F) sí llevan más aire porque son pocas líneas y no comprometen la
// paginación.

const BORDER = '#000';
const INK = '#111';
const MUTED = '#444';

// Celda compacta — usada en las tablas densas (B y C).
const CELL: React.CSSProperties = { border: `1px solid ${BORDER}`, padding: '3px 6px', verticalAlign: 'top', lineHeight: 1.35 };
const TABLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '8.3px', color: INK };
const HEAD_CELL: React.CSSProperties = { ...CELL, fontWeight: 700, textAlign: 'center', backgroundColor: '#F2F2F2' };
const CAT_CELL: React.CSSProperties = { ...CELL, fontWeight: 700, backgroundColor: '#E3E3E3', letterSpacing: '0.02em' };

// Checkbox literal "( )" / "(X)" — igual que el documento original (no usa
// glifos ☐/☒, que no aparecen en el PDF fuente).
const Box = ({ checked, label }: { checked?: boolean | null; label: string }) => (
  <span>({checked ? 'X' : ' '}) {label}</span>
);

// Fila de exame: el PDF muestra DOS casilleros por fila — "( ) Sim ( ) Não"
// antes del nombre del test — no uno solo. Ej: "( ) Sim  ( ) Não  Prick-test leite de vaca".
const SimNaoBox = ({ sim, label }: { sim?: boolean | null; label: string }) => (
  <span>
    ({sim === true ? 'X' : ' '}) Sim&nbsp;&nbsp;({sim === false ? 'X' : ' '}) Não&nbsp;&nbsp;{label}
  </span>
);

const CategoryRow = ({ label, colSpan }: { label: string; colSpan: number }) => (
  <tr><td colSpan={colSpan} style={CAT_CELL}>{label}</td></tr>
);

// Línea de campo estilo "Etiqueta: ___valor___" — la etiqueta no encoge y el
// valor ocupa el resto del ancho con un subrayado; el texto NUNCA se trunca,
// así nombres largos no quedan cortados con "...".
const FieldLine = ({ label, value, flex = 1 }: { label: string; value?: string; flex?: number }) => (
  <div style={{ flex, minWidth: 0, display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
    <span style={{ fontSize: '9.5px', color: INK, whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
    <span style={{
      flex: 1, minWidth: '20px', borderBottom: `1px solid ${BORDER}`,
      fontSize: '10.5px', fontWeight: 600, color: INK,
      paddingBottom: '2px', overflowWrap: 'break-word',
    }}>
      {value || ' '}
    </span>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p style={{
    margin: '13px 0 6px 0', fontSize: '11px', fontWeight: 700, color: INK,
    borderBottom: `1.5px solid ${BORDER}`, paddingBottom: '3px',
  }}>
    {children}
  </p>
);

const symptomsByCategory = (symptoms: SymptomEntry[]) => {
  const order: SymptomEntry['category'][] = ['cutaneos', 'gastrintestinais', 'respiratorios', 'outros'];
  return order.map(cat => ({ cat, items: symptoms.filter(s => s.category === cat) })).filter(g => g.items.length);
};

const examsByCategory = (exams: ExamEntry[]) => {
  const order: ExamEntry['category'][] = ['hipersensibilidade', 'gastrointestinal', 'anatomopatologico', 'outros'];
  return order.map(cat => ({ cat, items: exams.filter(e => e.category === cat) })).filter(g => g.items.length);
};

const PAGE_STYLE: React.CSSProperties = {
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#fff',
  color: INK,
  padding: '12mm 14mm',
  boxSizing: 'border-box',
  minHeight: '297mm',
};

export const PrintFormulaLeiteTemplate: React.FC = () => {
  const { selectedFormulaLeiteForPrint } = useApp();

  if (!selectedFormulaLeiteForPrint) return null;
  const f = selectedFormulaLeiteForPrint;

  return (
    <div className="print-area print-area-formula-leite" style={{ display: 'none', backgroundColor: '#fff' }}>

      {/* ══════════════════════════ PÁGINA 1 ══════════════════════════ */}
      <div style={{ ...PAGE_STYLE, pageBreakAfter: 'always', breakAfter: 'page' }}>

        {/* ── Masthead ─────────────────────────────────────────────── */}
        <div style={{ border: `1.5px solid ${BORDER}`, marginBottom: '10px' }}>
          <div style={{ padding: '7px 10px', textAlign: 'center', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 800, letterSpacing: '0.03em' }}>FORMULAS INFANTIS ESPECIAIS</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: 700 }}>FICHA DE AVALIAÇÃO PARA FORNECIMENTO</p>
          </div>
          <p style={{ margin: 0, padding: '4px 10px', textAlign: 'center', fontSize: '8.5px', fontStyle: 'italic', color: MUTED }}>
            (Deve ser preenchida pelo médico que acompanha a criança até o item E)
          </p>
        </div>

        <p style={{ fontSize: '10px', margin: '0 0 10px 0' }}>
          Data da primeira consulta: {isoToBRDate(f.firstConsultDate) || '_____/_____/_____'}
        </p>

        {/* ── A) Identificação ─────────────────────────────────────── */}
        <SectionTitle>A) Identificação:</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <FieldLine label="a. Nome:" value={f.patientName} flex={3} />
            <FieldLine label="Data de nascimento:" value={f.patientBirthDate} flex={1.3} />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <FieldLine label="Nome da mãe:" value={f.motherName} flex={2} />
            <FieldLine label="CNS do paciente:" value={f.patientCns} flex={1.3} />
          </div>
          <FieldLine label="b. Nome do profissional:" value={f.professionalName} />
          <div style={{ display: 'flex', gap: '16px' }}>
            <FieldLine label="c. Nome da instituição:" value={f.institutionName} flex={2} />
            <FieldLine label="CNES:" value={f.cnes} flex={1} />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <FieldLine label="d. Solicitação:" value={f.solicitation} flex={2} />
            <FieldLine label="Quantidade/mês:" value={f.quantityMonth} flex={1} />
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <FieldLine label="CID:" value={f.cid} flex={1} />
            <FieldLine label="DIAGNÓSTICO:" value={f.diagnostico} flex={3} />
          </div>
        </div>

        {/* ── B) Sinais e sintomas ─────────────────────────────────── */}
        <SectionTitle>B) Sinais e sintomas clínicos presentes:</SectionTitle>
        <table style={TABLE}>
          <colgroup>
            <col style={{ width: '32%' }} />
            <col /><col /><col /><col /><col /><col />
          </colgroup>
          <thead>
            <tr>
              <td style={{ ...HEAD_CELL, textAlign: 'left' }}></td>
              <td style={HEAD_CELL}>Idade inicial</td>
              <td style={HEAD_CELL}>Tempo latência</td>
              <td style={HEAD_CELL}>Duração</td>
              <td style={HEAD_CELL}>Freqüência</td>
              <td style={HEAD_CELL}>Ultimo episódio</td>
              <td style={HEAD_CELL}>Tratamento recebido</td>
            </tr>
          </thead>
          <tbody>
            {symptomsByCategory(f.symptoms).map(group => (
              <React.Fragment key={group.cat}>
                <CategoryRow label={SYMPTOM_CATEGORY_LABELS[group.cat]} colSpan={7} />
                {group.items.map(s => (
                  <tr key={s.id}>
                    <td style={CELL}><Box checked={s.checked} label={s.label} /></td>
                    <td style={CELL}>{s.idadeInicial || ''}</td>
                    <td style={CELL}>{s.tempoLatencia || ''}</td>
                    <td style={CELL}>{s.duracao || ''}</td>
                    <td style={CELL}>{s.frequencia || ''}</td>
                    <td style={CELL}>{s.ultimoEpisodio || ''}</td>
                    <td style={CELL}>{s.tratamento || ''}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '7.5px', margin: '4px 0 0 0', color: MUTED }}>
          * Tempo necessário entre a ingestão do alimento e o aparecimento dos sintomas
        </p>

        <p style={{ fontSize: '9.5px', fontWeight: 700, margin: '10px 0 3px 0' }}>Especifique os sintomas mais exacerbados</p>
        <div style={{ border: `1px solid ${BORDER}`, minHeight: '38px', padding: '5px 7px', fontSize: '9.5px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
          <RichText tag="span" html={f.symptomsNotes || ' '} />
        </div>
      </div>

      {/* ══════════════════════════ PÁGINA 2 ══════════════════════════ */}
      <div style={{ ...PAGE_STYLE, display: 'flex', flexDirection: 'column' }}>

        {/* ── C) Exames subsidiários ───────────────────────────────── */}
        <SectionTitle>C) Exames subsidiários realizados (mais recentes):</SectionTitle>
        <table style={TABLE}>
          <colgroup>
            <col />
            <col style={{ width: '60px' }} />
            <col style={{ width: '95px' }} />
          </colgroup>
          <thead>
            <tr>
              <td style={{ ...HEAD_CELL, textAlign: 'left' }}>Tipo</td>
              <td style={HEAD_CELL}>Data</td>
              <td style={HEAD_CELL}>Resultado</td>
            </tr>
          </thead>
          <tbody>
            {examsByCategory(f.exams).map(group => (
              <React.Fragment key={group.cat}>
                <CategoryRow
                  label={group.cat === 'outros' ? `${EXAM_CATEGORY_LABELS.outros}    Provocação` : EXAM_CATEGORY_LABELS[group.cat]}
                  colSpan={3}
                />
                {group.items.map(e => (
                  <tr key={e.id}>
                    <td style={CELL}>
                      {group.cat === 'outros' ? (e.label || ' ') : <SimNaoBox sim={e.sim} label={e.label} />}
                    </td>
                    <td style={CELL}>{e.data || ''}</td>
                    <td style={CELL}>{e.resultado || ''}</td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* ── D) Avaliação nutricional ─────────────────────────────── */}
        <SectionTitle>D) Avaliação da condição nutricional:</SectionTitle>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '7px' }}>
          <FieldLine label="a. Peso:" value={f.weightKg ? `${f.weightKg} kg` : ''} />
          <FieldLine label="b. Estatura:" value={f.heightCm ? `${f.heightCm} cm` : ''} />
        </div>
        <p style={{ fontSize: '9.5px', margin: '5px 0' }}>
          c. Criança no percentil de peso inferior a 10:&nbsp;
          <Box checked={f.percentileBelow10 === 'nao'} label="Não" />&nbsp;&nbsp;
          <Box checked={f.percentileBelow10 === 'sim'} label="Sim" />
        </p>
        <p style={{ fontSize: '9.5px', margin: '5px 0' }}>
          d. Desaceleração da curva de peso:&nbsp;
          <Box checked={f.weightDeceleration === 'nao'} label="Não" />&nbsp;&nbsp;
          <Box checked={f.weightDeceleration === 'sim'} label="Sim" />.
          &nbsp;Há quanto tempo? {f.weightDecelerationTime || '_______'}
        </p>

        <p style={{ fontSize: '9.5px', margin: '5px 0 4px 0' }}>Caso SIM anote os últimos pesos e datas:</p>
        <table style={{ ...TABLE, width: '55%' }}>
          <tbody>
            {(f.nutritionHistory?.length ? f.nutritionHistory : [{}, {}, {}]).map((h, i) => (
              <tr key={i}>
                <td style={CELL}>{i + 1}. Data: {h.data || ''}</td>
                <td style={CELL}>Peso: {h.peso ? `${h.peso} kg` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Rodapé / assinatura do médico ────────────────────────── */}
        <table style={{ ...TABLE, marginTop: '12px' }}>
          <tbody>
            <tr>
              <td style={{ ...CELL, width: '40%' }}>DATA: {isoToBRDate(f.footerDate) || '____/____/____'}</td>
              <td style={CELL}>CNS / MÉDICO RESPONSÁVEL: {f.doctorCns || ''}</td>
            </tr>
            <tr>
              <td style={{ ...CELL, height: '30px' }}>Carimbo:</td>
              <td style={CELL}>CPF / MÉDICO RESPONSÁVEL: {f.doctorCpf || ''}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ ...CELL, textAlign: 'center', height: '24px' }}>Assinatura</td>
            </tr>
          </tbody>
        </table>

        {/* ── F) Conduta ────────────────────────────────────────────── */}
        <SectionTitle>F) Conduta: <span style={{ fontWeight: 400, fontSize: '9px' }}>(uso restrito a SES-SP)</span></SectionTitle>
        <p style={{ fontSize: '9.5px', margin: '5px 0' }}>
          a. <Box checked={f.condutaOption === 'nao_preenche'} label="No momento, não preenche os critérios" />
        </p>
        <p style={{ fontSize: '9.5px', margin: '5px 0' }}>
          b. <Box checked={f.condutaOption === 'liberado'} label="Liberado o fornecimento de fórmula especial de" />{' '}
          {f.formulaLatas || '____'} latas, por {f.formulaMeses || '____'} (meses):
        </p>
        <div style={{ marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {['Proteína isolada de soja', 'Fórmula extensamente hidrolisada', 'Fórmula de aminoácidos'].map(opt => (
            <p key={opt} style={{ margin: 0, fontSize: '9.5px' }}><Box checked={f.formulaTypes?.includes(opt)} label={opt} /></p>
          ))}
        </div>
        <p style={{ fontSize: '9.5px', margin: '8px 0 0 0' }}>
          c. Data do retorno: {isoToBRDate(f.dataRetorno) || '____/____/____'} &nbsp;&nbsp;&nbsp; Previsão do teste de provocação: {isoToBRDate(f.previsaoProvocacao) || '____/____/____'}
        </p>

        <div style={{ flex: 1, minHeight: '18px' }} />

        <div style={{ textAlign: 'center', paddingBottom: '6mm' }}>
          <p style={{ fontSize: '9.5px', margin: 0 }}>{f.avaliador || ' '}</p>
          <div style={{ borderTop: `1px solid ${BORDER}`, width: '220px', margin: '4px auto 0' }} />
          <p style={{ fontSize: '8.5px', margin: '3px 0 0 0', color: MUTED }}>Avaliador — Assinatura e carimbo</p>
        </div>
      </div>
    </div>
  );
};

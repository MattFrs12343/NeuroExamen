import type { SymptomEntry, ExamEntry, NutritionHistoryEntry } from '../types';

// ── Catálogo fijo de la ficha "Fórmulas Infantis Especiais" ────────────────
// Reproduce, en el mismo orden y con el mismo texto, las secciones B y C del
// PDF original (`ficha_de_solicitacao_-_leite_com_cnes.pdf`). Cada ficha
// guardada snapshotea la entrada completa (categoría + label incluidos) en
// su columna JSON, así que editar este catálogo a futuro no afecta fichas
// ya guardadas — solo cambia lo que se precarga en un documento nuevo.

interface SymptomTemplate {
  id: string;
  category: SymptomEntry['category'];
  label: string;
}

export const SYMPTOM_CATEGORY_LABELS: Record<SymptomEntry['category'], string> = {
  cutaneos: 'Sintomas cutâneos',
  gastrintestinais: 'Sintomas gastrintestinais',
  respiratorios: 'Sintomas respiratórios',
  outros: 'Outros',
};

export const SYMPTOM_CATALOG: SymptomTemplate[] = [
  // Sintomas cutâneos
  { id: 'urticaria', category: 'cutaneos', label: 'urticária' },
  { id: 'prurido', category: 'cutaneos', label: 'prurido' },
  { id: 'rush', category: 'cutaneos', label: 'rush' },
  { id: 'angioedema', category: 'cutaneos', label: 'angioedema' },
  { id: 'dematite', category: 'cutaneos', label: 'dematite' },
  // Sintomas gastrintestinais
  { id: 'dor_abdominal', category: 'gastrintestinais', label: 'dor abdominal' },
  { id: 'diarreia', category: 'gastrintestinais', label: 'diarréia' },
  { id: 'constipacao_intestinal', category: 'gastrintestinais', label: 'constipação intestinal' },
  { id: 'vomito_nausea', category: 'gastrintestinais', label: 'vômito/ náusea' },
  { id: 'distensao_abdominal', category: 'gastrintestinais', label: 'distensão abdominal' },
  { id: 'flatulencia', category: 'gastrintestinais', label: 'flatulência' },
  { id: 'sangue_nas_fezes', category: 'gastrintestinais', label: 'sangue nas fezes' },
  { id: 'refluxo', category: 'gastrintestinais', label: 'refluxo' },
  // Sintomas respiratórios
  { id: 'broncoespasmo', category: 'respiratorios', label: 'broncoespasmo' },
  { id: 'tosse', category: 'respiratorios', label: 'tosse' },
  { id: 'prurido_orofaringe', category: 'respiratorios', label: 'prurido orofaringe' },
  { id: 'rinite_coriza_nasal', category: 'respiratorios', label: 'rinite e coriza nasal' },
  { id: 'edema_laringe', category: 'respiratorios', label: 'edema de laringe' },
  // Outros
  { id: 'anafilaxia', category: 'outros', label: 'anafilaxia' },
  { id: 'cefaleia', category: 'outros', label: 'cefaléia' },
  { id: 'edema_labial', category: 'outros', label: 'edema labial' },
  { id: 'otite', category: 'outros', label: 'otite' },
  { id: 'edema_ocular', category: 'outros', label: 'edema ocular' },
];

interface ExamTemplate {
  id: string;
  category: ExamEntry['category'];
  label: string;
}

export const EXAM_CATEGORY_LABELS: Record<ExamEntry['category'], string> = {
  hipersensibilidade: 'Hipersensibilidade',
  gastrointestinal: 'Avaliação gastrointestinal',
  anatomopatologico: 'Anatomopatológico',
  outros: 'Outros',
};

export const EXAM_CATALOG: ExamTemplate[] = [
  // Hipersensibilidade
  { id: 'prick_leite_vaca', category: 'hipersensibilidade', label: 'Prick-test leite de vaca' },
  { id: 'prick_soja', category: 'hipersensibilidade', label: 'Prick-test soja' },
  { id: 'rast_leite_vaca', category: 'hipersensibilidade', label: 'RAST leite de vaca' },
  { id: 'rast_alfa_lactoalbulina', category: 'hipersensibilidade', label: 'RAST alfa-lactoalbulina' },
  { id: 'rast_beta_lactoglobulina', category: 'hipersensibilidade', label: 'RAST beta-lactoglobulina' },
  { id: 'rast_caseina', category: 'hipersensibilidade', label: 'RAST caseína' },
  { id: 'rast_soja', category: 'hipersensibilidade', label: 'RAST soja' },
  // Avaliação gastrointestinal
  { id: 'sangue_oculto', category: 'gastrointestinal', label: 'Sangue oculto' },
  { id: 'alfa1_antitripsina_fecal', category: 'gastrointestinal', label: 'Alfa-1 antitripsina fecal' },
  { id: 'relacao_albumina_globulina', category: 'gastrointestinal', label: 'Relação albumina/globulina' },
  // Anatomopatológico
  { id: 'estomago', category: 'anatomopatologico', label: 'Estômago' },
  { id: 'esofago', category: 'anatomopatologico', label: 'Esôfago' },
  { id: 'duodeno', category: 'anatomopatologico', label: 'Duodeno' },
  { id: 'reto', category: 'anatomopatologico', label: 'Reto' },
];

/** Cantidad de filas en blanco de "Outros / Provocação" (label libre, sin checkbox Sim/Não). */
export const EXAM_OUTROS_ROW_COUNT = 5;

/** Opciones de fórmula especial de la sección F (checkboxes, no radio). */
export const FORMULA_TYPES = [
  'Proteína isolada de soja',
  'Fórmula extensamente hidrolisada',
  'Fórmula de aminoácidos',
];

/** Cantidad de filas del historial de pesos (D. "Caso SIM anote os últimos pesos e datas"). */
export const NUTRITION_HISTORY_ROW_COUNT = 3;

export const buildDefaultSymptoms = (): SymptomEntry[] =>
  SYMPTOM_CATALOG.map(s => ({ ...s, checked: false }));

export const buildDefaultExams = (): ExamEntry[] => [
  ...EXAM_CATALOG.map(e => ({ ...e, sim: null })),
  ...Array.from({ length: EXAM_OUTROS_ROW_COUNT }, (_, i) => ({
    id: `outros_${i}`,
    category: 'outros' as const,
    label: '',
    sim: null,
  })),
];

export const buildDefaultNutritionHistory = (): NutritionHistoryEntry[] =>
  Array.from({ length: NUTRITION_HISTORY_ROW_COUNT }, () => ({ data: '', peso: '' }));

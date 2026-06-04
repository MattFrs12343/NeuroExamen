import type { Exam } from '../types';

export const INITIAL_EXAMS: Exam[] = [
  // ── EEG ──────────────────────────────────────────────────────────────────
  { id: 'eeg-01', category: 'cat_eeg', name: 'exam_eeg_01' },

  // ── Potenciales Evocados ──────────────────────────────────────────────────
  { id: 'pev-01', category: 'cat_pev', name: 'exam_pev_01' },
  { id: 'pev-02', category: 'cat_pev', name: 'exam_pev_02' },

  // ── Electroneuromiografía — Extremidades superiores ───────────────────────
  { id: 'enm-sup-01', category: 'cat_enm_sup', name: 'exam_enm_sup_01' },
  { id: 'enm-sup-02', category: 'cat_enm_sup', name: 'exam_enm_sup_02' },
  { id: 'enm-sup-03', category: 'cat_enm_sup', name: 'exam_enm_sup_03' },

  // ── Electroneuromiografía — Extremidades inferiores ───────────────────────
  { id: 'enm-inf-01', category: 'cat_enm_inf', name: 'exam_enm_inf_01' },
  { id: 'enm-inf-02', category: 'cat_enm_inf', name: 'exam_enm_inf_02' },
  { id: 'enm-inf-03', category: 'cat_enm_inf', name: 'exam_enm_inf_03' },
  { id: 'enm-inf-04', category: 'cat_enm_inf', name: 'exam_enm_inf_04' },

  // ── Rostro ────────────────────────────────────────────────────────────────
  { id: 'fac-01', category: 'cat_face', name: 'exam_fac_01' },

  // ── Pruebas cognitivas ────────────────────────────────────────────────────
  { id: 'cog-01', category: 'cat_cog', name: 'exam_cog_01' },
  { id: 'cog-02', category: 'cat_cog', name: 'exam_cog_02' },

  // ── Dinamómetro ───────────────────────────────────────────────────────────
  { id: 'din-01', category: 'cat_din', name: 'exam_din_01' },

  // ── Imágenes por resonancia magnética computarizada ───────────────────────
  { id: 'rm-01', category: 'cat_rm', name: 'exam_rm_01' },
  { id: 'rm-02', category: 'cat_rm', name: 'exam_rm_02' },
  { id: 'rm-03', category: 'cat_rm', name: 'exam_rm_03' },
  { id: 'rm-04', category: 'cat_rm', name: 'exam_rm_04' },
  { id: 'rm-05', category: 'cat_rm', name: 'exam_rm_05' },
  { id: 'rm-06', category: 'cat_rm', name: 'exam_rm_06' },
  { id: 'rm-07', category: 'cat_rm', name: 'exam_rm_07' },
  { id: 'rm-08', category: 'cat_rm', name: 'exam_rm_08' },

  // ── Tomografía computarizada ──────────────────────────────────────────────
  { id: 'tc-01', category: 'cat_tc', name: 'exam_tc_01' },

  // ── Ultrasonido ───────────────────────────────────────────────────────────
  { id: 'us-01', category: 'cat_us', name: 'exam_us_01' },

  // ── Estesiometro ──────────────────────────────────────────────────────────
  { id: 'est-01', category: 'cat_est', name: 'exam_est_01' },
  { id: 'est-02', category: 'cat_est', name: 'exam_est_02' },
];

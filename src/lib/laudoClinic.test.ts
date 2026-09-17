import { describe, expect, it } from 'vitest';
import { getLaudoOwnProfile, getLaudoProfileFor } from './laudoClinic';

const base = {
  primaryColor: '#0F4C81',
  primaryDark: '#0a3a63',
};

const profiles = [
  { ...base, name: '+DOUTOR CLINICA E LABORATÓRIO', address: 'Av. Papa João Paulo I, 3086', phone: '11 98958 0281' },
  { ...base, name: 'CLINICA SAUDE CAMPINAS', doctorName: 'DR. JUAN MARCELO CABELLO MERIDA', doctorCrm: 'CRM: 161792/SP' },
  { ...base, name: 'CLINICA DOC SAUDE', doctorName: 'DR. Otro', doctorCrm: 'CRM: 999/SP' },
];

describe('laudoClassic', () => {
  it('no trata como perfil propio una fila vacía (sin datos de laudo)', () => {
    expect(getLaudoOwnProfile(profiles, '+DOUTOR CLINICA E LABORATÓRIO')).toBeUndefined();
  });

  it('reconoce como perfil propio a una clínica con datos', () => {
    expect(getLaudoOwnProfile(profiles, 'CLINICA DOC SAUDE')?.doctorName).toBe('DR. Otro');
  });

  it('una clínica sin perfil cae al formato estándar de Campinas, sin logo', () => {
    const p = getLaudoProfileFor(profiles, '+DOUTOR CLINICA E LABORATÓRIO');
    expect(p?.doctorName).toBe('DR. JUAN MARCELO CABELLO MERIDA');
    expect(p?.doctorCrm).toBe('CRM: 161792/SP');
    expect(p?.logo).toBeNull();
  });

  it('Campinas conserva su doctor y logo', () => {
    const p = getLaudoProfileFor(profiles, 'CLINICA SAUDE CAMPINAS');
    expect(p?.doctorName).toBe('DR. JUAN MARCELO CABELLO MERIDA');
  });
});
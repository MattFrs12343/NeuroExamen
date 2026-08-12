import { describe, it, expect } from 'vitest';
import {
  getEncProfile,
  withAlpha,
  encUi,
  ENC_PROFILE_KEYS,
  ENC_PROFILES,
  DEFAULT_ENC_PROFILE,
} from './encaminhamentoProfiles';

describe('getEncProfile', () => {
  it('devuelve neuromobius por defecto (id ausente o desconocido)', () => {
    expect(getEncProfile(undefined)).toBe(ENC_PROFILES.neuromobius);
    expect(getEncProfile(null)).toBe(ENC_PROFILES.neuromobius);
    expect(getEncProfile('unknown')).toBe(ENC_PROFILES.neuromobius);
  });

  it('devuelve neuroisbe cuando el templateId es neuroisbe', () => {
    expect(getEncProfile('neuroisbe')).toBe(ENC_PROFILES.neuroisbe);
  });

  it('el perfil por defecto declarado coincide con el fallback', () => {
    expect(DEFAULT_ENC_PROFILE).toBe('neuromobius');
  });
});

describe('withAlpha', () => {
  it('convierte hex #RRGGBB + alpha en rgba()', () => {
    expect(withAlpha('#5146B8', 0.1)).toBe('rgba(81, 70, 184, 0.1)');
  });

  it('preserva valores de alpha con decimales', () => {
    expect(withAlpha('#0F4C81', 0.08)).toBe('rgba(15, 76, 129, 0.08)');
  });
});

describe('encUi', () => {
  it('usa clases moradas para neuromobius', () => {
    const ui = encUi('neuromobius');
    expect(ui.iconCls).toBe('text-[#5146B8]');
    expect(ui.solidBtn).toContain('bg-[#5146B8]');
  });

  it('usa clases azules para neuroisbe', () => {
    const ui = encUi('neuroisbe');
    expect(ui.iconCls).toBe('text-[#0F4C81]');
    expect(ui.solidBtn).toContain('bg-[#0F4C81]');
  });
});

describe('perfiles de clínica', () => {
  it('expone exactamente dos clínicas', () => {
    expect(ENC_PROFILE_KEYS).toEqual(['neuromobius', 'neuroisbe']);
  });

  it('cada perfil tiene identidad y contactos consistentes', () => {
    for (const key of ENC_PROFILE_KEYS) {
      const p = ENC_PROFILES[key];
      expect(p.key).toBe(key);
      expect(p.label).toBeTruthy();
      expect(p.primary).toMatch(/^#[0-9A-F]{6}$/i);
      expect(p.primaryDark).toMatch(/^#[0-9A-F]{6}$/i);
      expect(p.headerSpecialties.length).toBeGreaterThan(0);
      expect(p.whatsappUrl).toContain('wa.me/');
    }
  });
});

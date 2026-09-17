import { describe, it, expect } from 'vitest';
import { normalizePhoneForWhatsApp, buildWhatsAppUrl } from './whatsapp';

describe('normalizePhoneForWhatsApp', () => {
  it('agrega 55 a un número brasileño sin código de país (DDD + 9 dígitos)', () => {
    expect(normalizePhoneForWhatsApp('11987654321')).toBe('5511987654321');
  });

  it('agrega 55 a un número brasileño sin código de país (DDD + 8 dígitos, fijo)', () => {
    expect(normalizePhoneForWhatsApp('1132654321')).toBe('551132654321');
  });

  it('respeta un código de país explícito con "+" (Bolivia) sin agregar 55', () => {
    expect(normalizePhoneForWhatsApp('+591 71234567')).toBe('59171234567');
  });

  it('respeta un código de país explícito con "+" aunque el largo coincida con un local brasileño', () => {
    // 591 (3) + 71234567 (8) = 11 dígitos — mismo largo que un celular
    // brasileño sin código de país. El "+" es lo único que desambigua.
    expect(normalizePhoneForWhatsApp('+59171234567')).toBe('59171234567');
  });

  it('respeta el prefijo internacional "00" quitándolo (no lo entiende wa.me)', () => {
    expect(normalizePhoneForWhatsApp('0059171234567')).toBe('59171234567');
  });

  it('deja igual un número largo sin "+" que no coincide con un local brasileño (no adivina un país)', () => {
    expect(normalizePhoneForWhatsApp('123456789')).toBe('123456789');
  });

  it('devuelve null para texto vacío o sin dígitos', () => {
    expect(normalizePhoneForWhatsApp('')).toBeNull();
    expect(normalizePhoneForWhatsApp('   ')).toBeNull();
    expect(normalizePhoneForWhatsApp('abc')).toBeNull();
  });

  it('devuelve null para un número demasiado corto para ser real (menos de 8 dígitos)', () => {
    // "+591" solo (código de país de Bolivia, sin el número del abonado) —
    // dato incompleto real visto en producción: abría wa.me/591, un link
    // roto, en silencio, sin avisar que el teléfono estaba incompleto.
    expect(normalizePhoneForWhatsApp('+591')).toBeNull();
    expect(normalizePhoneForWhatsApp('12345')).toBeNull();
  });
});

describe('buildWhatsAppUrl', () => {
  it('arma la URL de wa.me con el teléfono normalizado y el mensaje codificado', () => {
    expect(buildWhatsAppUrl('+591 71234567', 'Olá!')).toBe('https://wa.me/59171234567?text=Ol%C3%A1!');
  });

  it('devuelve null si el teléfono no tiene dígitos', () => {
    expect(buildWhatsAppUrl('', 'Olá!')).toBeNull();
  });
});

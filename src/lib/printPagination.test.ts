import { describe, expect, it } from 'vitest';
import { planDocIntoPanes, type DocBlock, type PanePlan } from './printPagination';

// Geometría del laudo: hoja útil 261mm, zona de seguridad 2mm y una firma que
// se reserva solo en la última hoja. Se trabaja en px-redondeados porque el
// módulo solo razona en px.
const LIMIT = 978;      // 261mm − 2mm de seguridad
const LAST_LIMIT = 700; // lo que queda en la última hoja al reservar la firma
const LINE = 20;        // una línea de 12.5px/1.6 ≈ 20px
const MIN = 2;          // minimum de líneas a cada lado de un corte

const options = { limitPx: LIMIT, lastLimitPx: LAST_LIMIT, minLines: MIN };

/** Bloque de texto con `lines` líneas de alto `linePx` (cortable entre líneas). */
const text = (topPx: number, lines: number, gapBeforePx = 0, linePx = LINE, marginTopPx = 0): DocBlock => ({
  topPx,
  heightPx: lines * linePx,
  gapBeforePx,
  marginTopPx,
  lineTopsPx: Array.from({ length: lines }, (_, i) => i * linePx),
});

/** Bloque no textual: sin cajas de línea, no se puede partir con seguridad. */
const opaque = (topPx: number, heightPx: number, gapBeforePx = 0): DocBlock => ({
  topPx,
  heightPx,
  gapBeforePx,
  marginTopPx: 0,
  lineTopsPx: [],
});

/** Todo lo que el plan imprime, como una lista plana, para comparar fácil. */
const flat = (panes: PanePlan[]) => panes.map((p) => p.blocks.map((b) => `${b.kind}#${b.blockIndex}`));

/** Suma de lo que la hoja imprime, incluidos los huecos entre bloques. */
const used = (pane: PanePlan) => pane.usedPx;

/**
 * `usedPx` tiene que ser EXACTAMENTE lo que la hoja imprime (alto de sus
 * bloques + separación entre ellos). Si no, la reserva de la firma decide
 * sobre una altura que no es la real y el contenido se sale de la hoja.
 */
const coherent = (pane: PanePlan) => {
  const sum = pane.blocks.reduce((acc, b, i) => acc + b.heightPx + (i === 0 ? 0 : b.gapPx), 0);
  return Math.abs(sum - pane.usedPx) < 0.5;
};

describe('planDocIntoPanes — bloques que caben', () => {
  it('un laudo corto va en una sola hoja y no se parte nada', () => {
    const panes = planDocIntoPanes([text(0, 4), text(100, 4, 12)], options);
    expect(flat(panes)).toEqual([['block#0', 'block#1']]);
  });

  it('el primer bloque de cada hoja no arrastra un margen fantasma', () => {
    const panes = planDocIntoPanes([text(0, 4, 0, LINE, 16), text(100, 4, 12)], options);
    expect(panes[0].leadMarginTopPx).toBe(16);
  });

  it('salta a la hoja siguiente antes de partir un bloque que sí cabe entero', () => {
    // 960px de texto + hueco 20px + 60px de título = 1040 > 978: el título
    // pasa entero a la segunda hoja, nunca se parte.
    const panes = planDocIntoPanes([text(0, 48), opaque(980, 60, 20)], options);
    expect(flat(panes)).toEqual([['block#0'], ['block#1']]);
  });

  it('mantiene la separación entre bloques al recalcular el salto', () => {
    const panes = planDocIntoPanes([text(0, 48), opaque(980, 60, 20)], options);
    expect(used(panes[1])).toBe(60);
  });
});

describe('planDocIntoPanes — bloques más altos que la hoja', () => {
  it('parte el bloque largo entre líneas y llena la primera hoja', () => {
    // 80 líneas = 1600px: 978px caben justo en 48 líneas (960px) y sobran 2
    // líneas, que se quedan en la hoja siguiente.
    const panes = planDocIntoPanes([text(0, 80)], options);
    expect(flat(panes)).toEqual([['slice#0'], ['slice#0']]);
    expect(panes[0].blocks[0].skipPx).toBe(0);
    expect(panes[0].blocks[0].heightPx).toBe(960);
  });

  it('el corte cae justo en un borde de línea: no parte ninguna línea', () => {
    const [head] = planDocIntoPanes([text(0, 80)], options);
    const { skipPx, heightPx } = head.blocks[0];
    expect(skipPx % LINE).toBe(0);
    expect((skipPx + heightPx) % LINE).toBe(0);
  });

  it('deja al menos 2 líneas a cada lado del corte', () => {
    const panes = planDocIntoPanes([text(0, 80)], options);
    for (const pane of panes) {
      const { skipPx, heightPx } = pane.blocks[0];
      expect((skipPx + heightPx) / LINE).toBeGreaterThanOrEqual(MIN); // huérfanos
      const tail = 1600 - skipPx - heightPx;                          // viudas
      expect(tail === 0 || tail / LINE >= MIN).toBe(true);
    }
  });

  it('los tramos del mismo bloque seguidos en la misma hoja se fusionan', () => {
    // 36 líneas (720px) en hojas de 700px: el corte a 34 líneas deja sitio
    // para un tramo más, y como es contiguo y cae en la MISMA hoja se vuelve a
    // unir en un solo recorte de 700px. Si no se fusionaran, la hoja tendría
    // dos recortes del mismo bloque y el usado contaría mal.
    const panes = planDocIntoPanes([text(0, 36)], { limitPx: 700, lastLimitPx: 700, minLines: MIN });
    expect(panes.map(used)).toEqual([700, 20]);
    expect(panes[0].blocks).toHaveLength(1);
    expect(panes[0].blocks[0].heightPx).toBe(700);
    expect(panes[1].blocks[0].skipPx).toBe(700);
  });

  it('un bloque sin texto medible se corta duro al límite, sin dejar hoja vacía', () => {
    // 2000px en hojas de 978px: 978 + 978 + 44, y ninguna hoja vacía.
    const panes = planDocIntoPanes([opaque(0, 2000)], options);
    expect(panes.map(used)).toEqual([978, 978, 44]);
  });
});

describe('planDocIntoPanes — reserva de la firma en la última hoja', () => {
  it('si la última hoja no deja lugar, devuelve su último bloque a una hoja nueva', () => {
    // 900px caben en una hoja normal, pero no con la firma: el bloque de
    // 240px se va a una segunda hoja y la primera queda con 900px... no, con
    // 660px, que es lo que realmente cabe.
    const panes = planDocIntoPanes([text(0, 33), opaque(680, 240, 20)], options);
    expect(flat(panes)).toEqual([['block#0'], ['block#1']]);
    expect(used(panes[0])).toBe(660);
  });

  it('parte entre líneas el bloque único que estorba a la firma', () => {
    // 40 líneas (800px) caben en una hoja normal, pero no en la última hoja
    // con la firma reservada (700px): se corta en 35 líneas y las 5 restantes
    // van a la hoja siguiente, con la firma.
    const panes = planDocIntoPanes([text(0, 40)], options);
    expect(flat(panes)).toEqual([['slice#0'], ['slice#0']]);
    expect(used(panes[0])).toBe(700);
    expect(panes[1].blocks[0].skipPx).toBe(700);
  });

  it('el corte de la firma también respeta el mínimo de líneas', () => {
    const panes = planDocIntoPanes([text(0, 40)], options);
    expect(used(panes[0]) / LINE).toBeGreaterThanOrEqual(MIN);
    expect((800 - used(panes[0])) / LINE).toBeGreaterThanOrEqual(MIN);
  });

  it('nunca deja la última hoja sin espacio para la firma', () => {
    // Barrido de todas las longitudes de 1 a 120 líneas: sea cual sea la
    // narrativa, la firma tiene que entrar en la última hoja.
    for (let lines = 1; lines <= 120; lines++) {
      const panes = planDocIntoPanes([text(0, lines)], options);
      expect(used(panes[panes.length - 1])).toBeLessThanOrEqual(LAST_LIMIT);
      expect(panes.every((p) => p.blocks.length > 0 && coherent(p))).toBe(true);
    }
  });

  it('tampoco con varios bloques delante de la firma', () => {
    // Narrativa + rótulo + diagnóstico + observações, con alturas y huecos
    // variables: la firma sigue entrando y ninguna hoja miente sobre su alto.
    for (let lines = 1; lines <= 90; lines++) {
      const panes = planDocIntoPanes(
        [opaque(0, 120), text(140, 3, 20), text(220, lines, 14), opaque(240 + lines * LINE, 60, 18)],
        options,
      );
      expect(used(panes[panes.length - 1])).toBeLessThanOrEqual(LAST_LIMIT);
      expect(panes.every((p) => p.blocks.length > 0 && coherent(p))).toBe(true);
      expect(panes.slice(0, -1).every((p) => used(p) <= LIMIT)).toBe(true);
    }
  });

  it('la hoja que cede espacio a la firma sigue usando su altura normal si puede', () => {
    // Con un bloque pequeño antes, la última hoja se queda solo con el texto
    // largo y la firma se respeta sin tirar hojas en blanco.
    const panes = planDocIntoPanes([opaque(0, 200), text(220, 60, 20)], options);
    expect(used(panes[panes.length - 1])).toBeLessThanOrEqual(LAST_LIMIT);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Paginación de documentos impresos en HOJAS A4 explícitas
// ─────────────────────────────────────────────────────────────────────────────
// Las plantillas que se imprimen en hojas explícitas (una por página física,
// con el contenido de cada una en una ventana fija que recorta su tramo) NO las
// pagina el motor de impresión: cada hoja mide 210×297mm exactos con su propio
// margen y fuerza su salto, y el corte entre hoja y hoja lo decide esta lógica
// midiendo el DOM real en px. Por eso `break-inside: avoid`, `page-break-inside`,
// `orphans` y `widows` de CSS no surten efecto ahí — no hay un flujo que el
// motor pueda cortar, el contenido se pinta entero y se recorta.
//
// Reglas que implementa (equivalentes a las de CSS):
//   · break-inside: avoid — un bloque (párrafo, título, diagnóstico, resumen,
//     caja de datos) NUNCA se parte: si no entra completo en lo que queda de
//     la hoja, pasa entero a la siguiente.
//   · orphans / widows — solo se parte un bloque cuando es MÁS ALTO que una
//     hoja entera (no hay más remedio) y el corte cae siempre entre cajas de
//     línea, con al menos `minLines` líneas a cada lado del corte. Nunca queda
//     una línea suelta ni al principio ni al final de una hoja.
//   · zona de seguridad inferior — el contenido de cada hoja termina `limitPx`
//     antes del borde inferior de la ventana, sumándose al margen físico de la
//     hoja (que ya es de 20mm): ninguna línea queda pegada al borde.
//   · pie de página — la firma va al fondo de la ÚLTIMA hoja, así que esa hoja
//     tiene menos altura útil: si el contenido no deja lugar para la firma se
//     devuelve lo que sobra a una hoja nueva (que queda como última) hasta que
//     la firma entre, partiendo un bloque entre líneas si es el único que
//     estorba, y sin cortar nunca contenido por la mitad.
//
// Ninguna función de este módulo toca el DOM: recibe medidas en px y devuelve
// el plan de hojas, así se puede probar sin navegador.
// ─────────────────────────────────────────────────────────────────────────────

/** 1mm en px CSS (96dpi) — el mismo factor que usa la medición del componente. */
export const PX_PER_MM = 96 / 25.4;

/** Tolerancia de redondeo al comparar alturas en px (sub-píxel). */
const EPS = 0.5;

/** Medidas de un bloque de primer nivel del contenido del documento. */
export interface DocBlock {
  /** Borde superior del bloque respecto del inicio del contenido, en px. */
  topPx: number;
  /** Alto de la caja de borde del bloque, en px. */
  heightPx: number;
  /** Margen colapsado respecto del bloque anterior (0 en el primero), en px. */
  gapBeforePx: number;
  /** margin-top real del bloque, en px (lo compensa el recorte de las rebanadas). */
  marginTopPx: number;
  /**
   * Borde superior de cada caja de línea del bloque, en px desde su borde
   * superior, en orden ascendente. Vacío = no se puede partir con seguridad
   * (bloque sin texto, o un párrafo de una sola línea).
   */
  lineTopsPx: number[];
}

/** Un bloque (o un tramo de bloque) asignado a una hoja. */
export interface PaneBlock {
  /** Índice del bloque de origen dentro de la lista del documento. */
  blockIndex: number;
  /** `block` = el bloque entero; `slice` = solo un tramo de líneas. */
  kind: 'block' | 'slice';
  /** Margen aplicado antes del bloque dentro de la hoja (0 si es el primero). */
  gapPx: number;
  /** Distancia en px desde el borde superior del bloque hasta la 1ª línea
   *  visible del tramo (solo en `slice`). */
  skipPx: number;
  /** Alto visible del bloque/tramo, en px. */
  heightPx: number;
  /** margin-top del bloque de origen, en px (solo en `slice`). */
  marginTopPx: number;
}

/** Una hoja: los bloques que se le imprimen, en orden. */
export interface PanePlan {
  blocks: PaneBlock[];
  /** Alto de contenido usado en la hoja, en px. */
  usedPx: number;
  /** margin-top del primer bloque de la hoja: se anula al imprimir para que
   *  ninguna hoja arranque con un margen fantasma. */
  leadMarginTopPx: number;
}

export interface PanePlanOptions {
  /** Alto útil de una hoja normal (hoja − zona de seguridad), en px. */
  limitPx: number;
  /** Alto útil de la ÚLTIMA hoja (además debe caber el pie), en px. */
  lastLimitPx: number;
  /** Mínimo de líneas a cada lado de un corte (2 = orphans/widows). */
  minLines?: number;
}

const newPane = (): PanePlan => ({ blocks: [], usedPx: 0, leadMarginTopPx: 0 });

/**
 * Mayor cantidad de líneas del bloque que entra en `capPx` sin dejar una línea
 * suelta a ningún lado del corte. Devuelve el índice de la primera línea del
 * siguiente tramo, o -1 si ni una línea entra. Si con `minLines` a cada lado no
 * hay solución (caso límite: quedan menos de `minLines` líneas), se relaja a 1
 * — es lo mismo que hace el motor de impresión cuando no puede satisfacer la
 * regla.
 */
const chooseEnd = (
  capPx: number,
  k: number,
  lines: number[],
  totalPx: number,
  minLines: number,
): number => {
  for (const min of [minLines, 1]) {
    for (let i = lines.length; i > k; i--) {
      const endPx = i >= lines.length ? totalPx : lines[i];
      if (endPx - lines[k] > capPx + EPS) continue;
      const tail = lines.length - i;
      if (tail > 0 && tail < min) continue; // widows
      if (i - k < min) continue;            // orphans
      return i;
    }
  }
  return -1;
};

/**
 * Posición del corte que parte el tramo [startPx, endPx) del bloque en dos, de
 * forma que la parte de arriba quepa en `maxPx` y el corte caiga SIEMPRE entre
 * dos cajas de línea, dejando al menos `minLines` líneas a cada lado. Devuelve
 * el corte en px desde el borde del bloque, o -1 si no hay ningún corte válido.
 * Se prueban primero los cortes más abajo (que llenan más la hoja) y, si no
 * admiten suficientes líneas, se relaja `minLines` a 1 como el motor de
 * impresión.
 */
const chooseCut = (
  startPx: number,
  endPx: number,
  lines: number[],
  maxPx: number,
  minLines: number,
): number => {
  // Los bordes superiores de línea son los únicos puntos donde se puede cortar
  // sin partir una línea por la mitad. Solo los que caen dentro del tramo.
  const inner = lines.filter((top) => top > startPx + EPS && top < endPx - EPS);
  const m = inner.length;
  for (const min of [Math.max(1, minLines), 1]) {
    for (let n = 0; n <= m; n++) {
      // n = cuántas líneas quedan por debajo del corte (0 = corte al final del
      // tramo). Al subir n el corte sube y la parte de arriba se hace más baja.
      const headLines = m - n;
      const cut = n === 0 ? endPx : inner[headLines];
      if (cut - startPx > maxPx + EPS) continue; // este y los de arriba no caben
      if (headLines < min) continue;             // el corte dejaría un huérfano
      if (n > 0 && n < min) continue;            // el corte dejaría una viuda
      return cut;
    }
  }
  return -1;
};

export const planDocIntoPanes = (
  blocks: DocBlock[],
  options: PanePlanOptions,
): PanePlan[] => {
  const { limitPx, lastLimitPx } = options;
  const minLines = Math.max(1, options.minLines ?? 2);

  const panes: PanePlan[] = [];
  let pane = newPane();

  const place = (p: {
    blockIndex: number;
    kind: 'block' | 'slice';
    skipPx: number;
    heightPx: number;
    marginTopPx: number;
    gapBeforePx: number;
  }): void => {
    const prev = pane.blocks[pane.blocks.length - 1];
    if (
      prev && prev.kind === 'slice' && p.kind === 'slice' &&
      prev.blockIndex === p.blockIndex && prev.skipPx + prev.heightPx === p.skipPx
    ) {
      // Tramos seguidos del MISMO bloque que caen en la misma hoja: se fusionan
      // en un solo recorte contiguo (imprime idéntico al bloque entero). El
      // usado de la hoja crece con la fusión: si no, la hoja creería estar más
      // vacía de lo que está y su contenido se saldría de la ventana.
      prev.heightPx += p.heightPx;
      pane.usedPx += p.heightPx;
      return;
    }
    if (pane.blocks.length === 0) {
      pane.leadMarginTopPx = p.kind === 'block' ? p.marginTopPx : 0;
    }
    pane.blocks.push({
      blockIndex: p.blockIndex,
      kind: p.kind,
      gapPx: pane.blocks.length === 0 ? 0 : p.gapBeforePx,
      skipPx: p.skipPx,
      heightPx: p.heightPx,
      marginTopPx: p.marginTopPx,
    });
    pane.usedPx += (pane.blocks.length === 1 ? 0 : p.gapBeforePx) + p.heightPx;
  };

  for (let b = 0; b < blocks.length; b++) {
    const blk = blocks[b];
    const gapNow = () => (pane.blocks.length ? blk.gapBeforePx : 0);

    // 1. Bloque que entra en una hoja vacía → átomo, nunca se parte.
    if (blk.heightPx <= limitPx + EPS) {
      if (pane.usedPx + gapNow() + blk.heightPx > limitPx + EPS) {
        panes.push(pane);
        pane = newPane();
      }
      place({
        blockIndex: b, kind: 'block', skipPx: 0,
        heightPx: blk.heightPx, marginTopPx: blk.marginTopPx, gapBeforePx: blk.gapBeforePx,
      });
      continue;
    }

    // 2. Bloque más alto que la hoja entera: no cabe entero en ninguna, así que
    //    se parte — pero solo entre líneas, con `minLines` a cada lado. El
    //    corte busca la hoja más baja posible (`limitPx`): llenar al máximo es
    //    lo que evita hojas en blanco. Si el tramo acaba siendo el último de
    //    todo el documento y no deja sitio para la firma, la fase de reserva
    //    del pie lo vuelve a cortar con el límite de la última hoja.
    const lines = blk.lineTopsPx;
    if (lines.length < 2) {
      // Sin cajas de línea (bloque sin texto medible): cortes duros al límite
      // de la hoja. Es el único caso donde una línea podría quedar pegada al
      // borde, y solo se da en contenido que no es texto.
      let offset = 0;
      let guard = 0;
      while (offset < blk.heightPx - EPS && guard++ < 1000) {
        const avail = limitPx - (pane.usedPx + gapNow());
        if (avail <= EPS) {
          panes.push(pane);
          pane = newPane();
          continue;
        }
        const take = Math.min(avail, blk.heightPx - offset);
        place({
          blockIndex: b, kind: 'slice', skipPx: offset, heightPx: take,
          marginTopPx: blk.marginTopPx, gapBeforePx: blk.gapBeforePx,
        });
        offset += take;
        panes.push(pane);
        pane = newPane();
      }
      continue;
    }

    let k = 0;
    let guard = 0;
    while (k < lines.length && guard++ < 1000) {
      const avail = limitPx - (pane.usedPx + gapNow());
      const i = chooseEnd(avail, k, lines, blk.heightPx, minLines);
      if (i < 0) {
        // Ni un tramo válido entra en lo que queda: el bloque baja entero a la
        // hoja siguiente (y sigue partiéndose allá si hace falta).
        if (pane.blocks.length === 0) {
          const endPx = blk.heightPx;
          place({
            blockIndex: b, kind: 'slice', skipPx: lines[k],
            heightPx: endPx - lines[k], marginTopPx: blk.marginTopPx,
            gapBeforePx: blk.gapBeforePx,
          });
          break;
        }
        panes.push(pane);
        pane = newPane();
        continue;
      }
      const endPx = i >= lines.length ? blk.heightPx : lines[i];
      place({
        blockIndex: b, kind: 'slice', skipPx: lines[k], heightPx: endPx - lines[k],
        marginTopPx: blk.marginTopPx, gapBeforePx: blk.gapBeforePx,
      });
      k = i;
    }
  }
  if (pane.blocks.length) panes.push(pane);

  // ── Reserva del pie (firma) en la última hoja ─────────────────────────────
  // La firma se ancla al fondo de la ÚLTIMA hoja, así que esa hoja tiene menos
  // alto útil. Si su contenido no deja lugar, se devuelve a una hoja nueva (que
  // pasa a ser la última) lo que sobra, y se repite hasta que la firma entre:
  //   · más de un bloque en la hoja → se devuelve el último entero;
  //   · UN solo bloque que no cabe → se devuelve PARTIDO entre líneas, con el
  //     mismo mínimo de líneas a cada lado del corte (si no hay texto medible,
  //     se corta duro al límite de la última hoja).
  // Nunca se reparte una hoja ya correcta ni se deja una hoja vacía, así que
  // el bucle termina siempre.
  for (let guard = 0; guard < 1000; guard++) {
    const last = panes[panes.length - 1];
    if (!last || last.usedPx <= lastLimitPx + EPS) break;

    const item = last.blocks[last.blocks.length - 1];
    if (!item) {
      panes.pop(); // hoja sin contenido: no se imprime
      continue;
    }

    if (last.blocks.length > 1) {
      last.blocks.pop();
      last.usedPx -= item.gapPx + item.heightPx;
      panes.push({
        blocks: [{ ...item, gapPx: 0 }],
        usedPx: item.heightPx,
        leadMarginTopPx: item.kind === 'block' ? item.marginTopPx : 0,
      });
      continue;
    }

    // Último y solo en su hoja, pero no cabe con la firma: hay que partirlo.
    const blk = blocks[item.blockIndex];
    const startPx = item.skipPx;
    const endPx = startPx + item.heightPx;
    // Primero se busca un corte ENTRE LÍNEAS; si el bloque no tiene texto
    // medible (no hay caja de línea que respetar) se corta duro al límite de
    // la última hoja, que es el mismo compromiso que hace el reparto normal.
    let cut = chooseCut(startPx, endPx, blk.lineTopsPx, lastLimitPx, minLines);
    if (cut < 0 && lastLimitPx > EPS) cut = startPx + lastLimitPx;
    if (cut <= startPx + EPS || cut >= endPx - EPS) break; // no hay corte posible
    const tail: PaneBlock = {
      blockIndex: item.blockIndex,
      kind: 'slice',
      gapPx: 0,
      skipPx: cut,
      heightPx: endPx - cut,
      marginTopPx: blk.marginTopPx,
    };
    if (item.kind === 'block') item.kind = 'slice'; // la cabeza ya es un tramo
    item.heightPx = cut - startPx;
    last.usedPx = item.heightPx;
    panes.push({ blocks: [tail], usedPx: tail.heightPx, leadMarginTopPx: 0 });
  }

  return panes.length ? panes : [newPane()];
};

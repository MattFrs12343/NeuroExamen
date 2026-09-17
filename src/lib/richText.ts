// ── Texto enriquecido mínimo ────────────────────────────────────────────────
// La app solo admite DOS formatos en los campos de texto libre: negrita (<b>)
// y subrayado (<u>). Los saltos de línea se guardan como <br>. Todo lo demás
// se escapa (nunca se confía en el HTML recibido) para evitar inyección tanto
// en pantalla (dangerouslySetInnerHTML) como en la impresión.
//
// El valor almacenado es HTML con ese subconjunto. Los datos viejos (texto
// plano con \n) siguen funcionando: se escapan y sus saltos se vuelven <br>.

const ALLOWED_TAG_RE = /&lt;(\/?)(b|strong|u|br)(\s*\/?)&gt;/gi;

// Decodifica entidades HTML una sola pasada (de izquierda a derecha, como un
// parser). Necesario porque lo que emite el editor (contentEditable) ya viene
// con entidades (&amp; para &, etc.): si re-escapamos sin decodificar primero,
// cada guardado/render dobla la codificación (&amp; → &amp;amp;). En el
// navegador usamos el texto de un <textarea>; fuera (Node/tests) hay un mapa
// mínimo con las entidades que generan el editor y el sanitizador.
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
};

const decodeEntities = (s: string): string => {
  if (typeof document === 'undefined') {
    return s.replace(/&([a-z]+|#\d+|#[xX][0-9a-fA-F]+);/g, (m, entity: string) => {
      const name = entity.toLowerCase();
      if (name.startsWith('#x')) return String.fromCodePoint(parseInt(name.slice(2), 16));
      if (name.startsWith('#')) return String.fromCodePoint(parseInt(name.slice(1), 10));
      return NAMED_ENTITIES[name] ?? m;
    });
  }
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
};

/**
 * Normaliza cualquier valor guardado (texto plano legado o nuestro HTML) a un
 * HTML seguro que solo contiene <b>, <u> y <br>. Es idempotente: aplicarlo dos
 * veces sobre el mismo valor produce exactamente el mismo HTML.
 */
export const richTextToHtml = (value: string | null | undefined): string => {
  const raw = String(value ?? '');
  if (!raw) return '';

  // 0) Decodifica entidades: garantiza que volver a escapar no duplique la
  //    codificación (el editor emite '&amp;' para '&', etc.).
  let s = decodeEntities(raw);

  // 1) Escapa TODO (incluidos los ángulos de etiquetas).
  s = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2) Vuelve a habilitar solo las etiquetas permitidas.
  s = s.replace(ALLOWED_TAG_RE, (_match, slash: string, tag: string) => {
    const name = tag.toLowerCase() === 'strong' ? 'b' : tag.toLowerCase();
    if (name === 'br') return '<br>';
    return `<${slash}${name}>`;
  });

  // 3) Los saltos de línea sueltos (texto legado) se vuelven <br>.
  s = s.replace(/\r\n|\r|\n/g, '<br>');

  return s;
};

/** Devuelve el texto plano (sin etiquetas y con saltos reales) del valor. */
export const richTextToPlain = (value: string | null | undefined): string =>
  decodeEntities(
    richTextToHtml(value)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  );

/** true si el campo no tiene texto visible (ignora <br> y espacios). */
export const isRichTextEmpty = (value: string | null | undefined): boolean =>
  richTextToPlain(value).replace(/\u00a0/g, ' ').trim() === '';

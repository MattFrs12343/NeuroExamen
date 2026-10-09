import { describe, expect, it } from 'vitest';
import { isRichTextEmpty, richTextToHtml, richTextToPlain } from './richText';

// El editor (contentEditable) emite el texto ya con entidades HTML (&amp;
// para &, &lt; para <...). El sanitizador debe ser idempotente: pasarle dos
// veces el mismo valor no debe duplicar la codificación (&amp; → &amp;amp;),
// ni en pantalla ni en el PDF firmado.

const EDITOR_SAMPLE = 'Informe: A &amp; B &lt; 5 &amp;&amp; ok';

describe('richTextToHtml — idempotencia y escapado', () => {
  it('no duplica entidades al volver a sanitizar', () => {
    const once = richTextToHtml(EDITOR_SAMPLE);
    const twice = richTextToHtml(once);
    expect(twice).toBe(once);
    expect(once).toBe(EDITOR_SAMPLE);
  });

  it('mantiene texto y entidades (render estable)', () => {
    expect(richTextToHtml(EDITOR_SAMPLE)).toBe(EDITOR_SAMPLE);
  });

  it('normaliza comillas y apóstrofes a caracteres reales (idempotente)', () => {
    const out = richTextToHtml('&#39;x&#39; &quot;y&quot;');
    expect(out).toBe("'x' \"y\"");
    expect(richTextToHtml(out)).toBe(out);
  });

  it('escapa etiquetas e intentos de inyección', () => {
    const evil = '<script>alert(1)</script><b onclick="x()">ok</b><style>*</style>';
    const out = richTextToHtml(evil);
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<style>');
    // La etiqueta con atributos se ELIMINA completa (no queda como texto
    // legible): solo el </b> desnudo se re-habilita.
    expect(out).not.toContain('<b onclick');
    expect(out).not.toContain('&lt;b onclick');
    expect(out).toBe('alert(1)ok</b>*');
    expect(richTextToHtml('<b>ok</b>')).toBe('<b>ok</b>');
  });

  it('elimina etiquetas no permitidas (span/font/etc.) y conserva su texto', () => {
    expect(richTextToHtml('texto <span style="font-weight:normal">x</span> más')).toBe('texto x más');
    expect(richTextToHtml('<font color="red">rojo</font>')).toBe('rojo');
    expect(richTextToHtml('<i>itálico</i><b>negrita</b>')).toBe('itálico<b>negrita</b>');
  });

  it('convierte strong a b y salta <br> y texto legado con \\n', () => {
    expect(richTextToHtml('<strong>n</strong>')).toBe('<b>n</b>');
    expect(richTextToHtml('a<br>b')).toBe('a<br>b');
    expect(richTextToHtml('a\nb')).toBe('a<br>b');
  });

  it('normaliza <div>/<p> de contentEditable (teclados táctiles) a <br>, sin dejarlos visibles', () => {
    expect(richTextToHtml('a<div>b</div><div>c</div>')).toBe('a<br>b<br>c<br>');
    expect(richTextToHtml('<p>a</p><p>b</p>')).toBe('a<br>b<br>');
    // Atributos inyectados en <div>/<p> se descartan enteros, no se escapan.
    expect(richTextToHtml('<div onclick="x()">a</div>')).not.toContain('onclick');
    expect(richTextToHtml('<div onclick="x()">a</div>')).not.toContain('<div');
  });
});

describe('richTextToPlain', () => {
  it('decodifica entidades a texto real', () => {
    expect(richTextToPlain('A &amp; B &lt; 5')).toBe('A & B < 5');
    expect(richTextToPlain('x<br>y')).toBe('x\ny');
  });
});

describe('isRichTextEmpty', () => {
  it('considera vacío el formato sin texto', () => {
    expect(isRichTextEmpty('<b></b><br>')).toBe(true);
    expect(isRichTextEmpty('&nbsp;')).toBe(true);
    expect(isRichTextEmpty(' <br><br> ')).toBe(true);
    expect(isRichTextEmpty('letra')).toBe(false);
  });
});
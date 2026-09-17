<?php
/**
 * Texto enriquecido mínimo — espejo de src/lib/richText.ts (misma lógica).
 *
 * La app solo admite DOS formatos en los campos de texto libre: negrita (<b>)
 * y subrayado (<u>). Los saltos de línea se guardan como <br>. Todo lo demás
 * se escapa (nunca se confía en el HTML recibido) para evitar inyección tanto
 * en pantalla como en el PDF firmado por servidor (TCPDF writeHTML).
 *
 * El valor almacenado es HTML con ese subconjunto. Los datos viejos (texto
 * plano con \n) siguen funcionando: se escapan y sus saltos se vuelven <br>.
 */

/**
 * Decodifica entidades HTML en una pasada (igual que un parser). Necesario
 * porque el editor de la app (contentEditable) emite entidades (&amp; para
 * &); si re-escapamos sin decodificar primero, cada guardado duplica la
 * codificación. html_entity_decode lo hace en una única pasada de izquierda
 * a derecha, así que &amp;lt; → &lt; (una vez, no dos).
 */
function decodeHtmlEntities(string $s): string
{
    return html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/** Normaliza cualquier valor guardado (texto plano legado o nuestro HTML) a un
 *  HTML seguro que solo contiene <b>, <u> y <br>. Es idempotente. */
function richTextToHtml($value): string
{
    $raw = (string)($value ?? '');
    if ($raw === '') return '';

    // 0) Decodifica entidades: evita el doble escape del editor.
    $s = decodeHtmlEntities($raw);

    // 1) Escapa TODO (incluidos los ángulos de etiquetas).
    $s = str_replace(['&', '<', '>'], ['&amp;', '&lt;', '&gt;'], $s);

    // 2) Vuelve a habilitar solo las etiquetas permitidas (strong → b).
    $s = preg_replace_callback(
        '~&lt;(/)?(b|strong|u|br)(\s*/)?&gt;~i',
        function ($m) {
            $slash = $m[1] === '/' ? '/' : '';
            $tag   = strtolower($m[2]);
            if ($tag === 'strong') $tag = 'b';
            if ($tag === 'br') return '<br>';
            return '<' . $slash . $tag . '>';
        },
        $s
    );

    // 3) Saltos de línea sueltos (texto legado) → <br>.
    return preg_replace('~\r\n|\r|\n~', '<br>', $s);
}

/** Devuelve el texto plano (sin etiquetas y con saltos reales) del valor. */
function richTextToPlain($value): string
{
    $s = richTextToHtml($value);
    $s = preg_replace('~<br\s*/?>~i', "\n", $s);
    $s = preg_replace('~<[^>]+>~', '', $s);
    return decodeHtmlEntities($s);
}

/** true si el campo no tiene texto visible (ignora <br> y espacios). */
function isRichTextEmpty($value): bool
{
    $plain = str_replace("\xC2\xA0", ' ', richTextToPlain($value));
    return trim($plain) === '';
}
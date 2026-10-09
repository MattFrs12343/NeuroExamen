import * as React from 'react';
import { Bold, Underline } from 'lucide-react';
import { cn } from '../../lib/utils';
import { richTextToHtml } from '../../lib/richText';

// ── Editor de texto enriquecido mínimo (negrita + subrayado) ────────────────
// contentEditable en vez de <textarea> porque un textarea no puede mostrar
// negrita/subrayado. El valor que emite onChange es HTML con solo <b>/<u>/<br>
// (ver src/lib/richText.ts). Mantiene una API parecida a Textarea para que
// reemplazarlo en los formularios sea directo.
//
// Notas de implementación:
// - Se escribe el innerHTML desde `value` SOLO cuando el contenido externo
//   cambió de verdad (no cuando el usuario teclea), para no perder el cursor.
//   Un cambio externo (p. ej. elegir una sugerencia) sí se refleja y deja el
//   cursor al final.
// - Enter inserta <br> (no <div>) para que el HTML guardado sea uniforme.
// - Pegar se fuerza a texto plano: evita traer estilos basura de otros sitios.

export interface RichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Clases para el contenedor (borde, fondo, etc.). */
  className?: string;
  /** Estilos para el área editable (fontSize, lineHeight, padding...). */
  style?: React.CSSProperties;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onClick?: () => void;
  /** Oculta la barra (útil si se quiere el campo sin formato). */
  toolbar?: boolean;
  /** Etiqueta accesible de la barra. */
  boldLabel?: string;
  underlineLabel?: string;
}

export const RichTextField: React.FC<RichTextFieldProps> = ({
  value,
  onChange,
  placeholder,
  className,
  style,
  autoFocus,
  onFocus,
  onBlur,
  onClick,
  toolbar = true,
  boldLabel = 'Negrita',
  underlineLabel = 'Subrayado',
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  // Último HTML que el propio editor emitió, para distinguir el tecleo del
  // usuario de un cambio externo del valor.
  const lastEmitted = React.useRef<string>('');
  const [isEmpty, setIsEmpty] = React.useState(true);
  const [active, setActive] = React.useState({ bold: false, underline: false });

  const computeEmpty = (el: HTMLElement) =>
    (el.textContent || '').replace(/\u00a0/g, ' ').trim() === '';

  const syncFromDom = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    lastEmitted.current = el.innerHTML;
    setIsEmpty(computeEmpty(el));
    onChange(el.innerHTML);
  }, [onChange]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const html = richTextToHtml(value);
    const focused = document.activeElement === el;
    // Si el usuario está tecleando, el valor viene de lo que él mismo emitió:
    // no tocar el DOM (rompería la posición del cursor).
    if (focused && value === lastEmitted.current) return;
    if (el.innerHTML === html) return;

    el.innerHTML = html;
    setIsEmpty(computeEmpty(el));

    // Cambio externo mientras el campo tiene foco: cursor al final.
    if (focused) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [value]);

  React.useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const updateActive = React.useCallback(() => {
    if (document.activeElement !== ref.current) return;
    try {
      setActive({
        bold: document.queryCommandState('bold'),
        underline: document.queryCommandState('underline'),
      });
    } catch {
      /* queryCommandState puede lanzar en algunos navegadores */
    }
  }, []);

  React.useEffect(() => {
    document.addEventListener('selectionchange', updateActive);
    return () => document.removeEventListener('selectionchange', updateActive);
  }, [updateActive]);

  const exec = (cmd: 'bold' | 'underline') => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    // Fuerza etiquetas (<b>/<u>) en vez de style="font-weight:...".
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(cmd);
    updateActive();
    syncFromDom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      syncFromDom();
    }
  };

  // En teclados táctiles/virtuales (tablet) Enter no siempre llega como un
  // keydown normal con key:'Enter' — a veces solo dispara beforeinput con
  // inputType:'insertParagraph', que handleKeyDown no detecta. Sin este
  // interceptor, el navegador cae en su comportamiento nativo y envuelve la
  // línea en <div> en vez de <br>, lo que richTextToHtml no reconoce y
  // termina mostrándose como texto literal ("<div>") en pantalla e impresión.
  const handleBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const inputType = (e.nativeEvent as InputEvent).inputType;
    if (inputType === 'insertParagraph') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      syncFromDom();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    syncFromDom();
  };

  return (
    <div className={cn('rich-text-field', className)}>
      {toolbar && (
        <div className="rich-text-toolbar">
          <button
            type="button"
            title={boldLabel}
            aria-label={boldLabel}
            className={cn('rich-text-btn', active.bold && 'is-active')}
            onMouseDown={e => e.preventDefault()}
            onClick={() => exec('bold')}
          >
            <Bold size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            title={underlineLabel}
            aria-label={underlineLabel}
            className={cn('rich-text-btn', active.underline && 'is-active')}
            onMouseDown={e => e.preventDefault()}
            onClick={() => exec('underline')}
          >
            <Underline size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        contentEditable
        suppressContentEditableWarning
        spellCheck
        data-placeholder={placeholder || ''}
        data-empty={isEmpty ? 'true' : 'false'}
        onInput={syncFromDom}
        onKeyDown={handleKeyDown}
        onBeforeInput={handleBeforeInput}
        onPaste={handlePaste}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
        className="rich-text-input"
        style={style}
      />
    </div>
  );
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, Eraser, Heading3, Highlighter, Italic, List, ListOrdered, Underline } from 'lucide-react';
import { NOTE_COLORS, isEmptyNotes, notesToHtml, sanitizeNotes } from '../lib/richText';

/** Sobe pela árvore até achar a etiqueta, sem sair do editor. */
function closestTag(node, tagName, boundary) {
  let current = node && node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
  while (current && current !== boundary) {
    if (current.nodeType === Node.ELEMENT_NODE && current.tagName === tagName) return current;
    current = current.parentNode;
  }
  return null;
}

/** Tira a etiqueta e deixa o texto no lugar. */
function unwrapElement(element) {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
  parent.normalize?.();
}

/**
 * Bloco de anotações com formatação, tipo Word.
 *
 * Sem biblioteca: é um `contentEditable` e os botões usam `execCommand`.
 * Quem manda no conteúdo é o navegador — o React só lê, nunca escreve de
 * volta a cada tecla (isso brigaria com o cursor).
 *
 * O que sai por `onChange` já vem limpo pela lista branca e vazio quando
 * não há texto, para o "Falta gravar" não acender à toa.
 */
export default function NotesEditor({ initialHtml, onChange, onReady, placeholder, id }) {
  const editorRef = useRef(null);
  const savedRange = useRef(null);
  const [empty, setEmpty] = useState(true);
  const [activeKey, setActiveKey] = useState('');

  const active = {
    heading: activeKey.includes('h'),
    bold: activeKey.includes('b'),
    italic: activeKey.includes('i'),
    underline: activeKey.includes('u'),
    list: activeKey.includes('ul'),
    ordered: activeKey.includes('ol'),
    mark: activeKey.includes('mk'),
  };

  const emit = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const clean = sanitizeNotes(editor.innerHTML);
    const blank = isEmptyNotes(clean);
    setEmpty(blank);
    onChange?.(blank ? '' : clean);
  }, [onChange]);

  // Coloca o texto uma vez. Depois disso o contentEditable é o dono.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = notesToHtml(initialHtml);
    const clean = sanitizeNotes(editor.innerHTML);
    const blank = isEmptyNotes(clean);
    setEmpty(blank);
    onReady?.(blank ? '' : clean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rememberSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    savedRange.current = range.cloneRange();
  }, []);

  /** No celular, tocar no botão tira o foco do texto: devolve a seleção. */
  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const range = savedRange.current;
    if (!range || !editor.contains(range.commonAncestorContainer)) return;
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const refreshActive = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    rememberSelection();
    const node = range.commonAncestorContainer;
    const key = [
      closestTag(node, 'H3', editor) ? 'h' : '',
      document.queryCommandState('bold') ? 'b' : '',
      document.queryCommandState('italic') ? 'i' : '',
      document.queryCommandState('underline') ? 'u' : '',
      document.queryCommandState('insertUnorderedList') ? 'ul' : '',
      document.queryCommandState('insertOrderedList') ? 'ol' : '',
      closestTag(node, 'MARK', editor) ? 'mk' : '',
    ]
      .filter(Boolean)
      .join('|');
    setActiveKey((current) => (current === key ? current : key));
  }, [rememberSelection]);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive);
    return () => document.removeEventListener('selectionchange', refreshActive);
  }, [refreshActive]);

  const runCommand = (command, value) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, false);
    document.execCommand(command, false, value);
    refreshActive();
    emit();
  };

  const runColor = (color) => {
    restoreSelection();
    // Com styleWithCSS ligado sai <span style="color: ..."> em vez de <font>.
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, color);
    document.execCommand('styleWithCSS', false, false);
    refreshActive();
    emit();
  };

  const toggleHeading = () => {
    restoreSelection();
    const selection = window.getSelection();
    const node = selection?.rangeCount ? selection.getRangeAt(0).commonAncestorContainer : null;
    runCommand('formatBlock', closestTag(node, 'H3', editorRef.current) ? '<div>' : '<h3>');
  };

  const toggleMark = () => {
    restoreSelection();
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    const existing = closestTag(range.commonAncestorContainer, 'MARK', editor);
    if (existing) {
      unwrapElement(existing);
      refreshActive();
      emit();
      return;
    }
    if (range.collapsed) return;

    const mark = editor.ownerDocument.createElement('mark');
    try {
      range.surroundContents(mark);
    } catch {
      // A seleção corta elementos no meio: recorta e embrulha.
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    }
    const after = editor.ownerDocument.createRange();
    after.selectNodeContents(mark);
    selection.removeAllRanges();
    selection.addRange(after);
    savedRange.current = after.cloneRange();
    refreshActive();
    emit();
  };

  const clearFormatting = () => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('removeFormat');
    if (document.queryCommandState('insertUnorderedList')) document.execCommand('insertUnorderedList');
    if (document.queryCommandState('insertOrderedList')) document.execCommand('insertOrderedList');
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (editor && selection?.rangeCount) {
      if (closestTag(selection.getRangeAt(0).commonAncestorContainer, 'H3', editor)) {
        document.execCommand('formatBlock', false, '<div>');
      }
      for (const mark of Array.from(editor.querySelectorAll('mark'))) unwrapElement(mark);
    }
    refreshActive();
    emit();
  };

  /** Colar entra como texto puro: não deixa vir lixo formatado de fora. */
  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (!text) return;
    restoreSelection();
    document.execCommand('insertText', false, text);
    emit();
  };

  // Segura o foco no botão para a seleção do texto não sumir no celular.
  const hold = (event) => event.preventDefault();

  const buttonClass = (on) => `notes-btn ${on ? 'is-on' : ''}`;
  const focusEditor = () => editorRef.current?.focus();

  return (
    <div className="notes-editor">
      <div className="notes-toolbar" role="toolbar" aria-label="Formatar anotação">
        <button type="button" className={buttonClass(active.heading)} onMouseDown={hold} onClick={toggleHeading} title="Título" aria-label="Título" aria-pressed={active.heading}>
          <Heading3 size={18} aria-hidden />
        </button>
        <span className="notes-toolbar__sep" aria-hidden />
        <button type="button" className={buttonClass(active.bold)} onMouseDown={hold} onClick={() => runCommand('bold')} title="Negrito" aria-label="Negrito" aria-pressed={active.bold}>
          <Bold size={18} aria-hidden />
        </button>
        <button type="button" className={buttonClass(active.italic)} onMouseDown={hold} onClick={() => runCommand('italic')} title="Itálico" aria-label="Itálico" aria-pressed={active.italic}>
          <Italic size={18} aria-hidden />
        </button>
        <button type="button" className={buttonClass(active.underline)} onMouseDown={hold} onClick={() => runCommand('underline')} title="Sublinhado" aria-label="Sublinhado" aria-pressed={active.underline}>
          <Underline size={18} aria-hidden />
        </button>
        <span className="notes-toolbar__sep" aria-hidden />
        <button type="button" className={buttonClass(active.list)} onMouseDown={hold} onClick={() => runCommand('insertUnorderedList')} title="Lista" aria-label="Lista" aria-pressed={active.list}>
          <List size={18} aria-hidden />
        </button>
        <button type="button" className={buttonClass(active.ordered)} onMouseDown={hold} onClick={() => runCommand('insertOrderedList')} title="Lista numerada" aria-label="Lista numerada" aria-pressed={active.ordered}>
          <ListOrdered size={18} aria-hidden />
        </button>
        <span className="notes-toolbar__sep" aria-hidden />
        <button type="button" className={buttonClass(active.mark)} onMouseDown={hold} onClick={toggleMark} title="Realce (marca-texto)" aria-label="Realce" aria-pressed={active.mark}>
          <Highlighter size={18} aria-hidden />
        </button>
        {NOTE_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            className="notes-btn notes-btn--color"
            onMouseDown={hold}
            onClick={() => runColor(color.value)}
            title={`Texto ${color.label.toLowerCase()}`}
            aria-label={`Texto na cor ${color.label}`}
          >
            <span className="notes-btn__dot" style={{ background: color.value }} aria-hidden />
          </button>
        ))}
        <span className="notes-toolbar__sep" aria-hidden />
        <button type="button" className="notes-btn" onMouseDown={hold} onClick={clearFormatting} title="Limpar formatação" aria-label="Limpar formatação">
          <Eraser size={18} aria-hidden />
        </button>
      </div>

      <div className="notes-field" onClick={focusEditor}>
        {empty && (
          <span className="notes-field__placeholder" aria-hidden>
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          id={id}
          className="notes-field__input"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Anotações desta viagem"
          lang="pt-BR"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          onInput={emit}
          onPaste={handlePaste}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onTouchEnd={refreshActive}
          onBlur={() => {
            rememberSelection();
            emit();
          }}
        />
      </div>
    </div>
  );
}

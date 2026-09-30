/**
 * Texto rico das anotações da viagem.
 *
 * Sem biblioteca: o campo é `contentEditable` e o que entra passa por uma
 * lista branca. Qualquer etiqueta fora da lista vira texto puro, qualquer
 * atributo fora da lista some. Assim nem HTML colado da internet nem um
 * valor alterado direto no banco consegue executar nada.
 */

/** Etiquetas que podem aparecer dentro da anotação. */
const ALLOWED_TAGS = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P', 'H3', 'UL', 'OL', 'LI', 'MARK', 'SPAN', 'FONT',
]);

/** Estas não merecem nem o texto: somem com tudo dentro. */
const DROP_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'TITLE', 'NOSCRIPT', 'SVG', 'MATH']);

/** As 3 cores de texto permitidas. São as cores que o app já usa. */
export const NOTE_COLORS = [
  { value: '#B45309', rgb: 'rgb(180, 83, 9)', label: 'Marrom' },
  { value: '#1F5B38', rgb: 'rgb(31, 91, 56)', label: 'Verde' },
  { value: '#1A3F7A', rgb: 'rgb(26, 63, 122)', label: 'Azul' },
];

/** A cor do marca-texto fica no CSS, em `.notes-field__input mark`. */

function toHex(value) {
  return `#${Number(value).toString(16).padStart(2, '0')}`;
}

/** Só aceita uma das 3 cores, escrita em hex ou em rgb(). */
function allowedColor(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const color of NOTE_COLORS) {
    if (lower === color.value.toLowerCase() || lower === color.rgb) return color.value;
  }
  const rgb = lower.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const hex = `${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`.toUpperCase();
    const found = NOTE_COLORS.find((color) => color.value.toUpperCase() === hex);
    if (found) return found.value;
  }
  return null;
}

/**
 * Tira a cor de dentro de um `style`. O navegador escreve tanto
 * `color: #1A3F7A` quanto `color: rgb(26, 63, 122)`, e às vezes aplica a cor
 * numa etiqueta que já existia (<u>, <b>) em vez de criar um <span> novo.
 */
function colorFromStyle(style) {
  const match = String(style ?? '').match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  return match ? allowedColor(match[1]) : null;
}

/**
 * Reescreve os atributos: tudo que não for uma cor da paleta some.
 * O `style` é reconstruído do zero, então nada de `expression()`,
 * `background-image`, `position` fixa ou qualquer outra surpresa.
 */
function stripAttributes(element) {
  const tag = element.tagName;
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    if (name === 'style') {
      const color = colorFromStyle(attribute.value);
      if (color) element.setAttribute('style', `color: ${color};`);
      else element.removeAttribute('style');
      continue;
    }
    if (name === 'color' && tag === 'FONT') {
      const color = allowedColor(attribute.value);
      if (color) element.setAttribute('color', color);
      else element.removeAttribute('color');
      continue;
    }
    element.removeAttribute(attribute.name);
  }
}

/** Devolve o primeiro nó que não pode ficar, ou null quando está tudo limpo. */
function findForbidden(root) {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.COMMENT_NODE) return node;
    if (!ALLOWED_TAGS.has(node.tagName)) return node;
    node = walker.nextNode();
  }
  return null;
}

/** Tira a etiqueta mas mantém o texto que estava dentro. */
function unwrap(element) {
  const parent = element.parentNode;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
}

/**
 * Limpa o HTML da anotação. Devolve só o que a lista branca aceita.
 * Roda no navegador antes de gravar e de novo antes de mostrar na tela.
 */
export function sanitizeNotes(html) {
  const source = String(html ?? '');
  if (!source.trim()) return '';
  const doc = new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
  const root = doc.body;

  // Cada volta tira um nó proibido; como desfazer um nó pode expor outros,
  // o laço recomeça do início até não sobrar nada.
  for (let guard = 0; guard < 2000; guard += 1) {
    const forbidden = findForbidden(root);
    if (!forbidden) break;
    if (forbidden.nodeType === Node.COMMENT_NODE || DROP_CONTENT.has(forbidden.nodeName)) {
      forbidden.remove();
    } else {
      unwrap(forbidden);
    }
  }

  for (const element of root.querySelectorAll('*')) stripAttributes(element);
  return root.innerHTML.trim();
}

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Texto gravado por versão antiga era puro, com quebras de linha.
 * Aqui ele vira HTML para não perder as linhas na tela.
 */
export function notesToHtml(stored) {
  const text = String(stored ?? '');
  if (!text.trim()) return '';
  if (/<[a-z!/][\s\S]*>/i.test(text)) return sanitizeNotes(text);
  return text
    .split(/\n{2,}/)
    .map((block) => block.split('\n').map(escapeHtml).join('<br>'))
    .filter(Boolean)
    .map((block) => `<div>${block}</div>`)
    .join('');
}

/** Só o texto, sem etiquetas. Serve para saber se está vazio e para o resumo. */
function notesText(html) {
  const source = String(html ?? '');
  if (!source.trim()) return '';
  const doc = new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
  return (doc.body.textContent || '').replace(/\u00a0/g, ' ').trim();
}

export function isEmptyNotes(html) {
  return notesText(html).length === 0;
}

/**
 * Resumo de uma linha, para o tooltip da lista de viagens.
 * Tira as etiquetas e junta os espaços.
 */
export function notesPreview(html, limit = 90) {
  const text = notesText(html).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

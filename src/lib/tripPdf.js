import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from './api';
import { displayPlace, formatTripDate, formatTripDateLong, placeKey, referenceForRoute } from './format';
import { isEmptyNotes, notesToHtml } from './richText';
import { maskDocument } from './passengerDisplay';

const NAVY = [15, 23, 42];
const HEADER = [30, 58, 95];
const PAPER = [243, 241, 236];
const PAPER_ALT = [235, 232, 225];
const BORDER = [197, 202, 209];
const PAID = [31, 91, 56];
const PENDING = [122, 74, 18];

export function tripPdfFileName(trip) {
  const [year, month, day] = (trip.trip_date || '').split('T')[0].split('-');
  const date = year && month && day ? `${day}-${month}-${year}` : 'sem-data';
  return `lista-${date}-${placeKey(trip.origin)}-${placeKey(trip.destination)}.pdf`;
}

function oneLine(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWord(count, one, many) {
  return `${count} ${Number(count) === 1 ? one : many}`;
}

const PDF_COLUMNS = [
  {
    key: 'number',
    head: 'N.',
    width: 16,
    value: (_seat, index) => String(index + 1),
  },
  {
    key: 'name',
    head: 'Nome',
    width: 90,
    value: (seat) => oneLine(seat.name),
  },
  {
    key: 'document',
    head: 'Documento',
    width: 68,
    value: (seat) => {
      const type = oneLine(seat.doc_type);
      const number = oneLine(maskDocument(seat.rg, seat.doc_type));
      if (type && number) return `${type} ${number}`;
      return type || number || '—';
    },
  },
  {
    key: 'ref',
    head: 'Ref.',
    width: 75,
    value: (seat) => oneLine(seat.reference_point) || '—',
  },
  {
    key: 'payment',
    head: 'Pagamento',
    width: 28,
    bold: true,
    value: (seat) => (seat.is_paid ? 'Pago' : 'Pendente'),
  },
];

function selectedPdfColumns(columns) {
  const picked = PDF_COLUMNS.filter((column) => columns?.[column.key]);
  return picked.length ? picked : PDF_COLUMNS.filter((column) => column.key === 'name');
}

function selectedAnnotationColumns(columns) {
  return columns?.annotations ? ['notes'] : [];
}

const NOTE_INK = [30, 41, 59];
const NOTE_MARK = [253, 230, 138];
const NOTE_PALETTE = {
  '#B45309': [180, 83, 9],
  '#1F5B38': [31, 91, 56],
  '#1A3F7A': [26, 63, 122],
};

function noteColor(raw) {
  const text = String(raw || '').trim().toLowerCase();
  const named = Object.keys(NOTE_PALETTE).find((key) => key.toLowerCase() === text);
  if (named) return NOTE_PALETTE[named];
  const rgb = text.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!rgb) return null;
  const hex = `#${[rgb[1], rgb[2], rgb[3]].map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
  const found = Object.keys(NOTE_PALETTE).find((key) => key.toLowerCase() === hex);
  return found ? NOTE_PALETTE[found] : null;
}

function paintOf(element) {
  const style = element.getAttribute?.('style') || '';
  const fromStyle = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  if (fromStyle) return noteColor(fromStyle[1]);
  if (element.tagName === 'FONT') return noteColor(element.getAttribute('color'));
  return null;
}

function sameRun(left, right) {
  return left.bold === right.bold
    && left.italic === right.italic
    && left.underline === right.underline
    && left.mark === right.mark
    && (left.color?.join() || '') === (right.color?.join() || '');
}

function styleFor(element, parent) {
  const tag = element.tagName;
  return {
    bold: parent.bold || tag === 'B' || tag === 'STRONG',
    italic: parent.italic || tag === 'I' || tag === 'EM',
    underline: parent.underline || tag === 'U',
    mark: parent.mark || tag === 'MARK',
    color: paintOf(element) || parent.color,
  };
}

function noteBlocks(html) {
  if (typeof DOMParser === 'undefined') return [];
  const source = notesToHtml(html);
  if (isEmptyNotes(source)) return [];
  const parsed = new DOMParser().parseFromString(`<body>${source}</body>`, 'text/html');
  const blocks = [];
  const base = { bold: false, italic: false, underline: false, mark: false, color: null };

  function open(kind, extra = {}) {
    if (kind === 'gap') {
      const last = blocks[blocks.length - 1];
      if (!last || last.kind === 'gap') return last || null;
    }
    const block = { kind, runs: [], ...extra };
    blocks.push(block);
    return block;
  }

  function add(block, text, style) {
    if (!block || !text) return;
    const last = block.runs[block.runs.length - 1];
    if (last && sameRun(last, style)) last.text += text;
    else block.runs.push({ text, ...style });
  }

  function inline(node, style, block) {
    if (node.nodeType === Node.TEXT_NODE) {
      add(block, node.textContent.replace(/\u00a0/g, ' '), style);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === 'BR') {
      add(block, '\n', style);
      return;
    }
    if (tag === 'UL' || tag === 'OL') {
      list(node, style, 0);
      return;
    }
    const next = styleFor(node, style);
    if (tag === 'DIV' || tag === 'P' || tag === 'H3') add(block, '\n', next);
    for (const child of node.childNodes) inline(child, next, block);
    if (tag === 'DIV' || tag === 'P' || tag === 'H3') add(block, '\n', next);
  }

  function list(node, style, depth) {
    const ordered = node.tagName === 'OL';
    let index = 1;
    for (const child of node.childNodes) {
      if (child.nodeType !== Node.ELEMENT_NODE || child.tagName !== 'LI') continue;
      const block = open('li', {
        marker: ordered ? `${index}. ` : '',
        bullet: !ordered,
        indent: depth,
      });
      index += 1;
      const next = styleFor(child, style);
      for (const grand of child.childNodes) {
        if (grand.nodeType === Node.ELEMENT_NODE && (grand.tagName === 'UL' || grand.tagName === 'OL')) {
          list(grand, styleFor(grand, next), depth + 1);
        } else {
          inline(grand, next, block);
        }
      }
    }
  }

  function blockNode(node, style) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.textContent.trim()) return;
      add(open('p'), node.textContent.replace(/\u00a0/g, ' '), style);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    const next = styleFor(node, style);
    if (tag === 'UL' || tag === 'OL') {
      list(node, next, 0);
      return;
    }
    if (tag === 'H3' || tag === 'P' || tag === 'DIV') {
      const text = (node.textContent || '').replace(/\u00a0/g, ' ').trim();
      if (!text) {
        open('gap');
        return;
      }
      const block = open(tag === 'H3' ? 'h3' : 'p');
      for (const child of node.childNodes) inline(child, next, block);
      return;
    }
    for (const child of node.childNodes) blockNode(child, next);
  }

  for (const child of parsed.body.childNodes) blockNode(child, base);
  while (blocks[0]?.kind === 'gap') blocks.shift();
  while (blocks.at(-1)?.kind === 'gap') blocks.pop();
  return blocks.filter((block) => block.kind === 'gap' || block.runs.some((run) => run.text.replace(/\s/g, '')));
}

function notePieces(runs) {
  const pieces = [];
  for (const run of runs) {
    for (const chunk of run.text.split(/(\n|\s+)/)) {
      if (!chunk) continue;
      if (chunk.includes('\n')) {
        pieces.push({ break: true });
        continue;
      }
      if (/^\s+$/.test(chunk)) {
        pieces.push({ ...run, text: ' ', space: true });
        continue;
      }
      pieces.push({ ...run, text: chunk });
    }
  }
  return pieces;
}

function noteFont(style, heading) {
  const bold = style.bold || heading;
  if (bold && style.italic) return 'bolditalic';
  if (bold) return 'bold';
  if (style.italic) return 'italic';
  return 'normal';
}

function applyNoteFont(doc, style, size, heading) {
  doc.setFont('helvetica', noteFont(style, heading));
  doc.setFontSize(size);
  doc.setTextColor(...(style.color || (heading ? HEADER : NOTE_INK)));
}

function drawNoteRun(doc, text, x, y, style, size, heading) {
  applyNoteFont(doc, style, size, heading);
  const width = doc.getTextWidth(text);
  if (style.mark && text.trim()) {
    doc.setFillColor(...NOTE_MARK);
    doc.rect(x, y - size * 0.28, width, size * 0.4, 'F');
    applyNoteFont(doc, style, size, heading);
  }
  doc.text(text, x, y);
  if (style.underline && text.trim()) {
    const color = style.color || (heading ? HEADER : NOTE_INK);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.25);
    doc.line(x, y + 0.7, x + width, y + 0.7);
  }
  return width;
}

function drawNotes(doc, html, startY) {
  const blocks = noteBlocks(html);
  if (!blocks.length) return;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const state = { y: startY };
  const room = (needed) => {
    if (state.y + needed <= pageHeight - 16) return;
    doc.addPage();
    state.y = 16;
  };

  room(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...HEADER);
  doc.text('Anotações', 14, state.y);
  state.y += 2;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(14, state.y, pageWidth - 14, state.y);
  state.y += 7;

  for (const block of blocks) {
    if (block.kind === 'gap') {
      state.y += 3.5;
      continue;
    }
    const heading = block.kind === 'h3';
    const size = heading ? 13 : 11;
    const lineHeight = size * 0.52;
    const indent = (block.indent || 0) * 7;
    const maxX = pageWidth - 14;
    room(lineHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(size);
    const markerWidth = block.bullet ? 5 : block.marker ? doc.getTextWidth(block.marker) : 0;
    const textLeft = 14 + indent + markerWidth;
    let x = textLeft;
    let markerDrawn = false;
    const paintMarker = () => {
      if (markerDrawn || (!block.marker && !block.bullet)) return;
      if (block.bullet) {
        doc.setFillColor(...NOTE_INK);
        doc.circle(14 + indent + 1.5, state.y - 1.2, 0.7, 'F');
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(size);
        doc.setTextColor(...NOTE_INK);
        doc.text(block.marker, 14 + indent, state.y);
      }
      markerDrawn = true;
    };
    const breakLine = () => {
      state.y += lineHeight;
      x = textLeft;
      room(lineHeight);
    };

    for (const piece of notePieces(block.runs)) {
      if (piece.break) {
        paintMarker();
        breakLine();
        continue;
      }
      applyNoteFont(doc, piece, size, heading);
      const width = doc.getTextWidth(piece.text);
      if (piece.space) {
        if (x === textLeft) continue;
        if (x + width > maxX) breakLine();
        else x += width;
        continue;
      }
      if (width > maxX - textLeft) {
        const parts = doc.splitTextToSize(piece.text, Math.max(20, maxX - textLeft));
        for (let index = 0; index < parts.length; index += 1) {
          applyNoteFont(doc, piece, size, heading);
          const partWidth = doc.getTextWidth(parts[index]);
          if (x > textLeft && x + partWidth > maxX) breakLine();
          paintMarker();
          x += drawNoteRun(doc, parts[index], x, state.y, piece, size, heading);
          if (index < parts.length - 1) breakLine();
        }
        continue;
      }
      if (x > textLeft && x + width > maxX) breakLine();
      paintMarker();
      x += drawNoteRun(doc, piece.text, x, state.y, piece, size, heading);
    }
    state.y += lineHeight + (heading ? 1.6 : 1.2);
  }
}

function drawFooter(doc, trip) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pages = doc.internal.getNumberOfPages();
  const page = doc.internal.getCurrentPageInfo().pageNumber;
  doc.setFillColor(255, 255, 255);
  doc.rect(0, pageHeight - 11, pageWidth, 11, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${tripPdfFileName(trip)}   ·   pagina ${page} de ${pages}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' },
  );
}

function widthsFor(columns) {
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  const raw = columns.map((column) => (column.width / total) * 277);
  const rounded = raw.map((width) => Math.round(width * 10) / 10);
  const diff = 277 - rounded.reduce((sum, width) => sum + width, 0);
  rounded[rounded.length - 1] = Math.round((rounded[rounded.length - 1] + diff) * 10) / 10;
  return rounded;
}

function buildPdf(trip, passengers, columns, { dropped = 0 } = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const paid = passengers.filter((seat) => seat.is_paid).length;
  const selected = selectedPdfColumns(columns).map((column) => (
    column.key === 'ref'
      ? {
          ...column,
          value: (seat) => oneLine(referenceForRoute(seat, trip.origin, trip.destination)) || '—',
        }
      : column
  ));
  const widths = widthsFor(selected);
  const paymentIndex = selected.findIndex((column) => column.key === 'payment');

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Lista da viagem', 14, 12);
  doc.setFontSize(13);
  doc.text(`${displayPlace(trip.origin)}  -  ${displayPlace(trip.destination)}`, 14, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(formatTripDateLong(trip.trip_date) || formatTripDate(trip.trip_date), pageWidth - 14, 12, {
    align: 'right',
  });
  const summary = [
    countWord(passengers.length, 'pessoa', 'pessoas'),
    `${paid} pagos`,
    countWord(passengers.length - paid, 'pendente', 'pendentes'),
  ];
  if (dropped > 0) summary.push(countWord(dropped, 'não vai', 'não vão'));
  doc.text(summary.join('   ·   '), pageWidth - 14, 20, { align: 'right' });

  autoTable(doc, {
    startY: 34,
    margin: { left: 10, right: 10, bottom: 14 },
    tableWidth: 277,
    head: [selected.map((column) => column.head)],
    body: passengers.map((seat, index) => selected.map((column) => column.value(seat, index))),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 2.4, right: 2, bottom: 2.4, left: 2 },
      textColor: [30, 41, 59],
      lineColor: BORDER,
      lineWidth: 0.2,
      overflow: 'ellipsize',
      valign: 'middle',
      halign: 'left',
    },
    headStyles: {
      fillColor: HEADER,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
      overflow: 'ellipsize',
    },
    alternateRowStyles: { fillColor: PAPER_ALT },
    bodyStyles: { fillColor: PAPER },
    columnStyles: Object.fromEntries(
      selected.map((column, index) => [
        index,
        {
          cellWidth: widths[index],
          ...(column.bold ? { fontStyle: 'bold' } : {}),
        },
      ]),
    ),
    didParseCell: (data) => {
      if (paymentIndex < 0 || data.section !== 'body' || data.column.index !== paymentIndex) return;
      const paidCell = String(data.cell.raw) === 'Pago';
      data.cell.styles.textColor = paidCell ? PAID : PENDING;
    },
  });

  const annotationColumns = selectedAnnotationColumns(columns);
  if (annotationColumns.includes('notes') && trip.notes && !isEmptyNotes(trip.notes)) {
    let startY = (doc.lastAutoTable?.finalY || 34) + 10;
    if (startY > doc.internal.pageSize.getHeight() - 28) {
      doc.addPage();
      startY = 16;
    }
    drawNotes(doc, trip.notes, startY);
  }

  const total = doc.internal.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    drawFooter(doc, trip);
  }

  return doc;
}

function whatsappGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 5 && hour <= 11) return 'Bom dia, Cumpadre.';
  if (hour >= 12 && hour <= 17) return 'Boa tarde, Cumpadre.';
  return 'Boa noite, Cumpadre.';
}

export function passengerWhatsappUrl(phone, { inBrowser = false } = {}) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  const full = digits.length <= 11 ? `55${digits}` : digits;
  if (inBrowser) return `https://web.whatsapp.com/send?phone=${full}`;
  return `https://wa.me/${full}`;
}

export function tripWhatsappUrl(phone, trip, { inBrowser = false } = {}) {
  const digits = String(phone || '').replace(/\D/g, '');
  const full = digits.length <= 11 ? `55${digits}` : digits;
  const text = [
    whatsappGreeting(),
    '',
    `Estou te enviando a lista da viagem de ${formatTripDate(trip.trip_date)}, ${displayPlace(trip.origin)} - ${displayPlace(trip.destination)}.`,
    '',
    'Abraço.',
  ].join('\n');
  if (inBrowser) {
    return `https://web.whatsapp.com/send?phone=${full}&text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export function createTripPdf(trip, passengers, columns, options) {
  return buildPdf(trip, passengers, columns, options);
}

export async function downloadTripPdf(trip, columns) {
  const { data, error } = await api.getPassengers(trip.id);
  if (error) throw new Error(error.message);
  const seats = data ?? [];
  // Quem marcou "não vai" fica de fora da lista impressa.
  const going = seats.filter((seat) => !seat.is_cancelled);
  createTripPdf(trip, going, columns, { dropped: seats.length - going.length }).save(tripPdfFileName(trip));
}

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from './api';
import { displayPlace, formatTripDate, formatTripDateLong, placeKey } from './format';
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

function widthsFor(columns) {
  const total = columns.reduce((sum, column) => sum + column.width, 0);
  const raw = columns.map((column) => (column.width / total) * 277);
  const rounded = raw.map((width) => Math.round(width * 10) / 10);
  const diff = 277 - rounded.reduce((sum, width) => sum + width, 0);
  rounded[rounded.length - 1] = Math.round((rounded[rounded.length - 1] + diff) * 10) / 10;
  return rounded;
}

function buildPdf(trip, passengers, columns) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const paid = passengers.filter((seat) => seat.is_paid).length;
  const selected = selectedPdfColumns(columns);
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
  doc.text(`${passengers.length} pessoas   ·   ${paid} pagos   ·   ${passengers.length - paid} pendentes`, pageWidth - 14, 20, {
    align: 'right',
  });

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
    didDrawPage: () => {
      const pages = doc.internal.getNumberOfPages();
      const page = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `${tripPdfFileName(trip)}   ·   pagina ${page} de ${pages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'center' },
      );
    },
  });

  return doc;
}

function whatsappGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 5 && hour <= 11) return 'Bom dia, Cumpadre.';
  if (hour >= 12 && hour <= 17) return 'Boa tarde, Cumpadre.';
  return 'Boa noite, Cumpadre.';
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

export async function downloadTripPdf(trip, columns) {
  const { data, error } = await api.getPassengers(trip.id);
  if (error) throw new Error(error.message);
  buildPdf(trip, data ?? [], columns).save(tripPdfFileName(trip));
}

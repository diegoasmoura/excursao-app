import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from './api';
import { displayPlace, formatTripDate, formatTripDateLong, placeKey } from './format';
import { formatPassengerPhone, maskDocument } from './passengerDisplay';

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

function buildPdf(trip, passengers) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const paid = passengers.filter((seat) => seat.is_paid).length;

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
    head: [['N.', 'Nome', 'Tipo', 'Documento', 'Telefone', 'Pagamento']],
    body: passengers.map((seat, index) => [
      String(index + 1),
      (seat.name || '').toLocaleUpperCase('pt-BR'),
      seat.doc_type || '—',
      maskDocument(seat.rg, seat.doc_type) || '—',
      formatPassengerPhone(seat.phone),
      seat.is_paid ? 'Pago' : 'Pendente',
    ]),
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
    },
    alternateRowStyles: { fillColor: PAPER_ALT },
    bodyStyles: { fillColor: PAPER },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 86 },
      2: { cellWidth: 24 },
      3: { cellWidth: 72 },
      4: { cellWidth: 42 },
      5: { cellWidth: 28, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 5) return;
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

export function tripWhatsappUrl(phone, trip) {
  const digits = String(phone || '').replace(/\D/g, '');
  const full = digits.length <= 11 ? `55${digits}` : digits;
  const text = [
    whatsappGreeting(),
    '',
    `Estou te enviando a lista da viagem de ${formatTripDate(trip.trip_date)}, ${displayPlace(trip.origin)} - ${displayPlace(trip.destination)}.`,
    '',
    'O arquivo já baixou. É só anexar nesta conversa.',
    '',
    'Abraço.',
  ].join('\n');
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export async function downloadTripPdf(trip) {
  const { data, error } = await api.getPassengers(trip.id);
  if (error) throw new Error(error.message);
  buildPdf(trip, data ?? []).save(tripPdfFileName(trip));
}

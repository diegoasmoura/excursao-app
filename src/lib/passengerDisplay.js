export const DOC_TYPES = ['CPF', 'RG', 'Certidão', 'Outro'];

export function digitsOnly(value) {
  return (value || '').replace(/\D/g, '');
}

export function maskPhone(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskCpf(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskRg(value) {
  const digits = digitsOnly(value).slice(0, 9);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}-${digits.slice(8)}`;
}

export function maskCertidao(value) {
  const digits = digitsOnly(value).slice(0, 32);
  const cuts = [6, 8, 10, 14, 15, 20, 23, 30, 32];
  const chunks = [];
  let start = 0;
  for (const end of cuts) {
    if (digits.length <= start) break;
    chunks.push(digits.slice(start, end));
    start = end;
  }
  return chunks.join(' ');
}

export function maskDocument(value, docType) {
  if (docType === 'CPF') return maskCpf(value);
  if (docType === 'RG') return maskRg(value);
  if (docType === 'Certidão') return maskCertidao(value);
  return (value || '').slice(0, 40);
}

export function documentPlaceholder(docType) {
  if (docType === 'CPF') return '000.000.000-00';
  if (docType === 'RG') return '00.000.000-0';
  if (docType === 'Certidão') return '000000 00 00 0000 0 00000 000 0000000 00';
  return '';
}

export function inferDocType(docStr) {
  const digits = (docStr || '').replace(/\D/g, '');
  if (digits.length === 11 && !/[a-zA-Z]/.test(docStr || '')) return 'CPF';
  if (digits.length === 32) return 'Certidão';
  if (docStr?.trim()) return 'RG';
  return 'Outro';
}

export function getPassengerDocMeta(docStr, storedType) {
  const docType = storedType && DOC_TYPES.includes(storedType) ? storedType : inferDocType(docStr);
  return { docType, docStr: docStr || '' };
}

export function formatPassengerPhone(phone) {
  if (!phone || !String(phone).trim()) return '-';
  const masked = maskPhone(phone);
  return masked || '-';
}

export function sortPassengers(list, sortField, sortDirection) {
  return [...list].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

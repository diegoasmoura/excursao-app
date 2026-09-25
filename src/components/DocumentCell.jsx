import { getPassengerDocMeta, maskDocument } from '../lib/passengerDisplay';

export default function DocumentCell({ rg, docType, part = 'number' }) {
  const meta = getPassengerDocMeta(rg, docType);
  if (part === 'type') return meta.docStr || meta.docType !== 'Outro' ? meta.docType : '—';
  return maskDocument(meta.docStr, meta.docType) || '—';
}

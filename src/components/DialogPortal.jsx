import { createPortal } from 'react-dom';

export default function DialogPortal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

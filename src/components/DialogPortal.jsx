import { useEffect } from 'react';
import { createPortal } from 'react-dom';

let lockCount = 0;
let savedMainOverflow = '';
let savedMainScroll = 0;

function isInsideDialog(event) {
  return Boolean(event.target.closest?.('.confirm-dialog'));
}

function stopBackgroundScroll(event) {
  if (isInsideDialog(event)) return;
  event.preventDefault();
}

function lockPageScroll() {
  lockCount += 1;
  if (lockCount !== 1) return;

  const html = document.documentElement;
  const body = document.body;
  const main = document.querySelector('.main-content');

  html.dataset.dialogOpen = 'true';
  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';

  if (main) {
    savedMainOverflow = main.style.overflow;
    savedMainScroll = main.scrollTop;
    main.style.overflow = 'hidden';
  }

  document.addEventListener('touchmove', stopBackgroundScroll, { passive: false });
  document.addEventListener('wheel', stopBackgroundScroll, { passive: false });
}

function unlockPageScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0) return;

  const html = document.documentElement;
  const body = document.body;
  const main = document.querySelector('.main-content');

  delete html.dataset.dialogOpen;
  html.style.overflow = '';
  body.style.overflow = '';

  if (main) {
    main.style.overflow = savedMainOverflow;
    main.scrollTop = savedMainScroll;
  }

  document.removeEventListener('touchmove', stopBackgroundScroll);
  document.removeEventListener('wheel', stopBackgroundScroll);
}

export default function DialogPortal({ children }) {
  useEffect(() => {
    lockPageScroll();
    return () => unlockPageScroll();
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

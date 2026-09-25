import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIosSafari() {
  const agent = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(agent) && !/crios|fxios|edgios/i.test(agent);
}

export default function InstallPrompt() {
  const layout = useLayout();
  const [installEvent, setInstallEvent] = useState(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pwa-install-hide') === '1');

  useEffect(() => {
    if (isStandalone()) return undefined;
    const onPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (dismissed || isStandalone() || layout === 'desktop') return null;

  const hide = () => {
    sessionStorage.setItem('pwa-install-hide', '1');
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <div className="install-prompt">
      {installEvent ? (
        <button type="button" className="btn btn-secondary install-prompt__action" onClick={install}>
          <Download size={18} aria-hidden />
          Instalar no celular
        </button>
      ) : (
        <p className="install-prompt__hint">
          {isIosSafari()
            ? 'No iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.'
            : 'No menu do navegador, escolha Instalar app ou Adicionar à tela inicial.'}
        </p>
      )}
      <button type="button" className="install-prompt__close" onClick={hide}>
        Agora não
      </button>
    </div>
  );
}

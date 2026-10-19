import { Bus, CalendarDays, LogOut, MapPin, Settings, Users } from 'lucide-react';
import { APP_VERSION } from '../lib/appVersion';

const MAIN_ITEMS = [
  { id: 'trips', icon: CalendarDays, short: 'Viagens', long: 'Viagens' },
  { id: 'people', icon: Users, short: 'Pessoas', long: 'Pessoas' },
  { id: 'references', icon: MapPin, short: 'Pontos', long: 'Referências' },
];

function screenTone(view, settingsOpen, mainClassName) {
  if (settingsOpen) return 'main-content--settings';
  if (mainClassName.includes('main-content--detail')) return 'main-content--detail';
  if (view === 'people') return 'main-content--people';
  if (view === 'references') return 'main-content--references';
  return 'main-content--trips';
}

export default function AppShell({ view, settingsOpen = false, onNavigate, onOpenSettings, onLogout, children, mainClassName = '' }) {
  const tone = screenTone(view, settingsOpen, mainClassName);

  return (
    <div className="app-layout">
      <main className={`main-content ${tone}`}>{children}</main>

      <aside className="app-nav">
        <div className="app-nav__brand">
          <Bus size={22} aria-hidden />
          <div>
            <strong>Excursões</strong>
            <span>Administração<span className="app-version"> · {APP_VERSION}</span></span>
          </div>
        </div>
        <nav className="app-nav__tabs" aria-label="Navegação principal">
          {MAIN_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = !settingsOpen && view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-item ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={20} aria-hidden />
                <span className="nav-label nav-label--short">{item.short}</span>
                <span className="nav-label nav-label--long">{item.long}</span>
              </button>
            );
          })}
          <div className="app-nav__footer">
            <button
              type="button"
              className={`sidebar-item sidebar-item--settings ${settingsOpen ? 'active' : ''}`}
              aria-current={settingsOpen ? 'page' : undefined}
              onClick={onOpenSettings}
            >
              <Settings size={20} aria-hidden />
              <span className="nav-label nav-label--short">Ajustes</span>
              <span className="nav-label nav-label--long">Ajustes</span>
            </button>
            <button type="button" className="sidebar-item sidebar-item--logout" onClick={onLogout}>
              <LogOut size={20} aria-hidden />
              <span className="nav-label nav-label--short">Sair</span>
              <span className="nav-label nav-label--long">Sair</span>
            </button>
          </div>
        </nav>
      </aside>
    </div>
  );
}

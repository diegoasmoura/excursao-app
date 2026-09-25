import { Bus, CalendarDays, LogOut, Settings, Users } from 'lucide-react';

const MAIN_ITEMS = [
  { id: 'trips', icon: CalendarDays, short: 'Viagens', long: 'Viagens' },
  { id: 'people', icon: Users, short: 'Pessoas', long: 'Pessoas' },
];

export default function AppShell({ view, onNavigate, onOpenSettings, onLogout, children, mainClassName = '' }) {
  return (
    <div className="app-layout">
      <main className={`main-content ${mainClassName}`.trim()}>{children}</main>

      <aside className="app-nav">
        <div className="app-nav__brand">
          <Bus size={22} aria-hidden />
          <div>
            <strong>Excursões</strong>
            <span>Administração</span>
          </div>
        </div>
        <nav className="app-nav__tabs" aria-label="Navegação principal">
          {MAIN_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-item ${view === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={20} aria-hidden />
                <span className="nav-label nav-label--short">{item.short}</span>
                <span className="nav-label nav-label--long">{item.long}</span>
              </button>
            );
          })}
          <div className="app-nav__footer">
            <button type="button" className="sidebar-item sidebar-item--settings" onClick={onOpenSettings}>
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

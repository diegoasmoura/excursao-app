import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { api } from '../lib/api';
import DialogPortal from './DialogPortal';

const SIDES = [
  {
    id: 'going',
    title: 'Uberlândia x Pirapora',
    other: 'Pirapora x Uberlândia',
  },
  {
    id: 'back',
    title: 'Pirapora x Uberlândia',
    other: 'Uberlândia x Pirapora',
  },
];

function peopleWord(count) {
  return `${count} ${count === 1 ? 'pessoa' : 'pessoas'}`;
}

export default function ReferencesScreen() {
  const confirm = useConfirm();
  const [groups, setGroups] = useState({ going: [], back: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openKey, setOpenKey] = useState(null);
  const [rename, setRename] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error: fetchError } = await api.getReferences();
    if (fetchError) {
      setError(fetchError.message);
      setGroups({ going: [], back: [] });
    } else {
      setError(null);
      setGroups({ going: data?.going ?? [], back: data?.back ?? [] });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const moveGroup = async (side, item) => {
    const conflictNote = item.conflicts
      ? ` ${item.conflicts === 1 ? '1 pessoa já tem' : `${item.conflicts} pessoas já têm`} outro ponto em ${side.other}. Esse ponto será trocado.`
      : '';
    const ok = await confirm({
      title: 'Mudar itinerário',
      message: `Mover «${item.label}» de ${side.title} para ${side.other}? ${peopleWord(item.count)} ${item.count === 1 ? 'muda' : 'mudam'} junto.${conflictNote}`,
      confirmLabel: 'Mudar',
      cancelLabel: 'Não',
      danger: false,
    });
    if (!ok) return;
    const { error: moveError } = await api.moveReference({ side: side.id, label: item.label });
    if (moveError) {
      setError(moveError.message);
      return;
    }
    setOpenKey(null);
    await load();
  };

  const startRename = (side, item) => {
    setRename({ side, item });
    setRenameText(item.label);
  };

  const saveRename = async (event) => {
    event.preventDefault();
    if (!rename) return;
    const next = renameText.trim().replace(/\s+/g, ' ');
    if (!next || next === rename.item.label) {
      setRename(null);
      return;
    }
    setSaving(true);
    const { error: renameError } = await api.renameReference({
      side: rename.side.id,
      label: rename.item.label,
      to: next,
    });
    setSaving(false);
    if (renameError) {
      setError(renameError.message);
      return;
    }
    setRename(null);
    setOpenKey(null);
    await load();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <MapPin size={26} aria-hidden />
            Referências
          </h1>
          <p>Cada ponto aparece uma vez. Mudar o itinerário vale para todas as pessoas daquele ponto.</p>
        </div>
      </div>

      {error && (
        <div className="feedback-warning">
          <strong>{error}</strong>
        </div>
      )}

      {loading ? (
        <p>Carregando pontos...</p>
      ) : (
        <div className="ref-board">
          {SIDES.map((side) => {
            const items = groups[side.id] ?? [];
            return (
              <section key={side.id} className="ref-group panel">
                <h2>{side.title}</h2>
                {items.length === 0 ? (
                  <p className="ref-group__empty">Nenhum ponto neste itinerário.</p>
                ) : (
                  <ul className="ref-list">
                    {items.map((item) => {
                      const key = `${side.id}:${item.label}`;
                      const open = openKey === key;
                      return (
                        <li key={key} className="ref-item">
                          <button
                            type="button"
                            className="ref-item__main"
                            aria-expanded={open}
                            onClick={() => setOpenKey(open ? null : key)}
                          >
                            <strong>{item.label}</strong>
                            <span>{peopleWord(item.count)}</span>
                          </button>
                          {open && (
                            <ul className="ref-item__names">
                              {item.names.map((name, index) => (
                                <li key={`${name}-${index}`}>{name}</li>
                              ))}
                            </ul>
                          )}
                          <div className="ref-item__actions">
                            <button type="button" className="btn btn-secondary" onClick={() => moveGroup(side, item)}>
                              Mudar itinerário
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => startRename(side, item)}>
                              Corrigir nome
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {rename && (
        <DialogPortal>
          <div className="confirm-overlay" onClick={() => !saving && setRename(null)}>
            <form
              className="confirm-dialog"
              onClick={(event) => event.stopPropagation()}
              onSubmit={saveRename}
            >
              <h2>Corrigir ponto</h2>
              <p>{`O nome novo vale para ${peopleWord(rename.item.count)} em ${rename.side.title}.`}</p>
              <input
                className="form-input"
                value={renameText}
                onChange={(event) => setRenameText(event.target.value)}
                autoFocus
              />
              <div className="confirm-dialog__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setRename(null)} disabled={saving}>
                  Não
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Corrigir'}
                </button>
              </div>
            </form>
          </div>
        </DialogPortal>
      )}
    </div>
  );
}

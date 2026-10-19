import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, MapPin, Pencil } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useFitPageSize } from '../hooks/useFitPageSize';
import { usePagedItems } from '../hooks/usePagedItems';
import { api } from '../lib/api';
import DialogPortal from './DialogPortal';
import PaginationBar from './PaginationBar';
import SortableTh, { compareNumber, compareText, nextSort } from './SortableTh';

const SIDES = [
  {
    id: 'going',
    title: 'Uberlândia x Pirapora',
    short: 'UDI x Pira',
    other: 'Pirapora x Uberlândia',
  },
  {
    id: 'back',
    title: 'Pirapora x Uberlândia',
    short: 'Pira x UDI',
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
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'label', dir: 'asc' });
  const [names, setNames] = useState(null);
  const [rename, setRename] = useState(null);
  const [renameText, setRenameText] = useState('');
  const [saving, setSaving] = useState(false);
  const [listArea, setListArea] = useState(null);
  const pageSize = useFitPageSize(listArea);

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

  const rows = useMemo(() => {
    const list = [];
    for (const side of SIDES) {
      for (const item of groups[side.id] ?? []) {
        list.push({ ...item, side, key: `${side.id}:${item.label}` });
      }
    }
    return list;
  }, [groups]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term
      ? rows.filter((item) =>
          [item.label, item.side.short, item.side.title, ...item.names].some((value) =>
            (value || '').toLowerCase().includes(term),
          ),
        )
      : [...rows];
    return list.sort((a, b) => {
      if (sort.key === 'side') return compareText(a.side.short, b.side.short, sort.dir);
      if (sort.key === 'count') return compareNumber(a.count, b.count, sort.dir);
      return compareText(a.label, b.label, sort.dir);
    });
  }, [rows, query, sort]);

  const paged = usePagedItems(filtered, pageSize, `${query}|${sort.key}|${sort.dir}`);

  const moveGroup = async (item) => {
    const { side } = item;
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
    setNames(null);
    await load();
  };

  const startRename = (item) => {
    setRename(item);
    setRenameText(item.label);
  };

  const saveRename = async (event) => {
    event.preventDefault();
    if (!rename) return;
    const next = renameText.trim().replace(/\s+/g, ' ');
    if (!next || next === rename.label) {
      setRename(null);
      return;
    }
    setSaving(true);
    const { error: renameError } = await api.renameReference({
      side: rename.side.id,
      label: rename.label,
      to: next,
    });
    setSaving(false);
    if (renameError) {
      setError(renameError.message);
      return;
    }
    setRename(null);
    setNames(null);
    await load();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <MapPin size={26} aria-hidden />
            Referências
            <span className="page-title__count">{filtered.length}</span>
          </h1>
          <p>Cada ponto aparece uma vez. Mudar o itinerário vale para todas as pessoas daquele ponto.</p>
        </div>
      </div>

      {error && (
        <div className="feedback-warning">
          <strong>{error}</strong>
        </div>
      )}

      <div className="people-layout">
        <div className="people-layout__list">
          <input
            className="form-input people-search"
            placeholder="Buscar ponto ou pessoa"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {loading ? (
            <p>Carregando pontos...</p>
          ) : filtered.length === 0 ? (
            <div className="panel empty-state">
              <h3>Nenhum ponto encontrado</h3>
              <p>Os pontos aparecem aqui quando alguém já tem um cadastrado.</p>
            </div>
          ) : (
            <div className="paged-table" ref={setListArea}>
              <div className="grid-table-wrap">
                <table className="grid-table references-table">
                  <colgroup>
                    <col className="col-name" />
                    <col className="col-route" />
                    <col className="col-count" />
                    <col className="col-icon" />
                    <col className="col-icon" />
                  </colgroup>
                  <thead>
                    <tr>
                      <SortableTh column="label" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                        Ponto
                      </SortableTh>
                      <SortableTh column="side" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                        Itinerário
                      </SortableTh>
                      <SortableTh column="count" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                        Pessoas
                      </SortableTh>
                      <th>Corrigir</th>
                      <th>Mudar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.slice.map((item) => (
                      <tr key={item.key}>
                        <td className="name-cell" title={item.label}>{item.label}</td>
                        <td>{item.side.short}</td>
                        <td className="people-table__count">
                          <button type="button" className="table-link" onClick={() => setNames(item)}>
                            {item.count}
                          </button>
                        </td>
                        <td className="trips-table__icon">
                          <button
                            type="button"
                            className="icon-action"
                            title="Corrigir nome"
                            aria-label="Corrigir nome"
                            onClick={() => startRename(item)}
                          >
                            <Pencil size={16} />
                          </button>
                        </td>
                        <td className="trips-table__icon">
                          <button
                            type="button"
                            className="icon-action"
                            title={`Mudar para ${item.side.other}`}
                            aria-label="Mudar itinerário"
                            onClick={() => moveGroup(item)}
                          >
                            <ArrowLeftRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                page={paged.page}
                pageCount={paged.pageCount}
                pageSize={paged.pageSize}
                total={paged.total}
                from={paged.from}
                to={paged.to}
                onPage={paged.setPage}
              />
            </div>
          )}
        </div>
      </div>

      {names && (
        <DialogPortal>
          <div className="confirm-overlay" onClick={() => setNames(null)}>
            <div className="confirm-dialog confirm-dialog--wide" onClick={(event) => event.stopPropagation()}>
              <h2>{names.label}</h2>
              <p>{`${peopleWord(names.count)} em ${names.side.title}.`}</p>
              <div className="grid-table-wrap">
                <table className="grid-table history-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {names.names.map((name, index) => (
                      <tr key={`${name}-${index}`}>
                        <td>{name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="confirm-dialog__actions">
                <button type="button" className="btn btn-secondary" onClick={() => setNames(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </DialogPortal>
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
              <p>{`O nome novo vale para ${peopleWord(rename.count)} em ${rename.side.title}.`}</p>
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

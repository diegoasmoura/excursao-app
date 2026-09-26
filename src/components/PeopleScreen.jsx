import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useFitPageSize } from '../hooks/useFitPageSize';
import { usePagedItems } from '../hooks/usePagedItems';
import { api } from '../lib/api';
import { formatTripDate, routeLabel } from '../lib/format';
import { formatPassengerPhone, inferDocType } from '../lib/passengerDisplay';
import DocumentCell from './DocumentCell';
import PaginationBar from './PaginationBar';
import DialogPortal from './DialogPortal';
import PersonForm, { emptyPersonForm } from './PersonForm';
import SortableTh, { compareNumber, compareText, nextSort } from './SortableTh';

export default function PeopleScreen({ onOpenTrip }) {
  const confirm = useConfirm();
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [history, setHistory] = useState(null);
  const [listArea, setListArea] = useState(null);
  const pageSize = useFitPageSize(listArea);

  const load = async () => {
    setLoading(true);
    const { data, error: fetchError } = await api.getPeople();
    if (fetchError) {
      setError(fetchError.message);
      setPeople([]);
    } else {
      setError(null);
      setPeople(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term
      ? people.filter((person) =>
          [person.name, person.phone, person.rg, person.reference_point].some((value) => (value || '').toLowerCase().includes(term)),
        )
      : [...people];
    return [...list].sort((a, b) => {
      if (sort.key === 'phone') return compareText(a.phone, b.phone, sort.dir);
      if (sort.key === 'docType') return compareText(a.doc_type || inferDocType(a.rg), b.doc_type || inferDocType(b.rg), sort.dir);
      if (sort.key === 'document') return compareText(a.rg, b.rg, sort.dir);
      if (sort.key === 'reference') return compareText(a.reference_point, b.reference_point, sort.dir);
      if (sort.key === 'past') return compareNumber(a.trip_count ?? a.past_count, b.trip_count ?? b.past_count, sort.dir);
      if (sort.key === 'last') return compareText(a.last_trip_date, b.last_trip_date, sort.dir);
      return compareText(a.name, b.name, sort.dir);
    });
  }, [people, query, sort]);

  const paged = usePagedItems(filtered, pageSize, `${query}|${sort.key}|${sort.dir}`);

  const startEdit = (person, event) => {
    event?.stopPropagation();
    setForm({
      id: person.id,
      name: person.name || '',
      rg: person.rg || '',
      phone: person.phone || '',
      doc_type: person.doc_type || inferDocType(person.rg),
      reference_point: person.reference_point || '',
    });
  };

  const deletePerson = async (person, event) => {
    event?.stopPropagation();
    const ok = await confirm({
      title: 'Excluir pessoa',
      message: `Excluir ${person.name}? A pessoa sai desta lista e de todas as viagens.`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    const { error: deleteError } = await api.deletePerson(person.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setPeople((current) => current.filter((item) => item.id !== person.id));
    if (history?.id === person.id) setHistory(null);
    if (form?.id === person.id) setForm(null);
  };

  const savePerson = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = { name: form.name, rg: form.rg, phone: form.phone, doc_type: form.doc_type, reference_point: form.reference_point };
    const { data, error: saveError } = form.id
      ? await api.updatePerson(form.id, payload)
      : await api.createPerson(payload);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setForm(null);
    await load();
  };

  const openHistory = async (person, event) => {
    event.stopPropagation();
    const { data, error: fetchError } = await api.getPerson(person.id);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setHistory(data);
  };

  const openTripFromHistory = (tripId, personId) => {
    setHistory(null);
    onOpenTrip?.(tripId, personId);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Users size={26} aria-hidden />
            Pessoas
            <span className="page-title__count">{filtered.length}</span>
          </h1>
          <p>Cadastro geral. Quem entrar numa viagem também fica nesta lista.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setForm({ ...emptyPersonForm })}
        >
          <UserPlus size={18} color="#fff" aria-hidden />
          Nova pessoa
        </button>
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
            placeholder="Buscar por nome, telefone ou documento"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {loading ? (
            <p>Carregando pessoas...</p>
          ) : filtered.length === 0 ? (
            <div className="panel empty-state">
              <h3>Nenhuma pessoa encontrada</h3>
              <p>Cadastre a primeira pessoa ou busque outro nome.</p>
            </div>
          ) : (
            <div className="paged-table" ref={setListArea}>
            <div className="grid-table-wrap">
              <table className="grid-table people-table">
                <colgroup>
                  <col className="col-name" />
                  <col className="col-phone" />
                  <col className="col-type" />
                  <col className="col-document" />
                  <col className="col-ref" />
                  <col className="col-count" />
                  <col className="col-last" />
                  <col className="col-icon" />
                  <col className="col-icon" />
                </colgroup>
                <thead>
                  <tr>
                    <SortableTh column="name" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                      Nome
                    </SortableTh>
                    <SortableTh column="phone" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                      Telefone
                    </SortableTh>
                    <SortableTh column="docType" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                      Tipo
                    </SortableTh>
                <SortableTh column="document" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                  Número
                </SortableTh>
                <SortableTh column="reference" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                  Ref.
                </SortableTh>
                <SortableTh column="past" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                  Viagens
                </SortableTh>
                <SortableTh column="last" sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))}>
                  Última
                </SortableTh>
                <th>Editar</th>
                <th>Excluir</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.slice.map((person) => (
                    <tr key={person.id}>
                      <td className="name-cell">{person.name}</td>
                      <td>{formatPassengerPhone(person.phone)}</td>
                      <td>
                        <DocumentCell rg={person.rg} docType={person.doc_type} part="type" />
                      </td>
                  <td>
                    <DocumentCell rg={person.rg} docType={person.doc_type} part="number" />
                  </td>
                  <td>{person.reference_point || '—'}</td>
                  <td className="people-table__count" onClick={(event) => event.stopPropagation()}>
                    {(person.trip_count ?? person.past_count) > 0 ? (
                      <button type="button" className="table-link" onClick={(event) => openHistory(person, event)}>
                        {person.trip_count ?? person.past_count}
                      </button>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="people-table__count" onClick={(event) => event.stopPropagation()}>
                    {person.last_trip_id ? (
                      <button
                        type="button"
                        className="table-link"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTripFromHistory(person.last_trip_id, person.id);
                        }}
                      >
                        {formatTripDate(person.last_trip_date)}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="trips-table__icon" onClick={(event) => event.stopPropagation()}>
                        <button type="button" className="icon-action" title="Editar" aria-label="Editar" onClick={(event) => startEdit(person, event)}>
                          <Pencil size={16} />
                        </button>
                      </td>
                  <td className="trips-table__icon" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className="icon-action icon-action--danger"
                      title="Excluir"
                      aria-label="Excluir"
                      onClick={(event) => deletePerson(person, event)}
                    >
                      <Trash2 size={16} />
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

      {history && (
        <DialogPortal>
        <div className="confirm-overlay" onClick={() => setHistory(null)}>
          <div className="confirm-dialog confirm-dialog--wide" onClick={(event) => event.stopPropagation()}>
            <h2>Viagens de {history.name}</h2>
            <p>Clique numa linha para abrir a viagem com esta pessoa destacada.</p>
            {(history.trips || []).length === 0 ? (
              <p>Ainda não esteve em nenhuma viagem.</p>
            ) : (
              <div className="grid-table-wrap">
                <table className="grid-table history-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Rota</th>
                      <th>Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history.trips].reverse().map((trip) => (
                      <tr
                        key={trip.seat_id || trip.id}
                        className="is-clickable"
                        onClick={() => openTripFromHistory(trip.id, history.id)}
                      >
                        <td>{formatTripDate(trip.trip_date)}</td>
                        <td>{routeLabel(trip.origin, trip.destination)}</td>
                        <td>{trip.is_paid ? 'Pago' : 'Pendente'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="confirm-dialog__actions">
              <button type="button" className="btn btn-secondary" onClick={() => setHistory(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
        </DialogPortal>
      )}

      {form && (
        <DialogPortal>
        <div className="confirm-overlay" onClick={() => setForm(null)}>
          <form
            className="confirm-dialog confirm-dialog--wide"
            onClick={(event) => event.stopPropagation()}
            onSubmit={savePerson}
          >
            <h2>{form.picked ? 'Pessoa já cadastrada' : form.id ? 'Editar pessoa' : 'Nova pessoa'}</h2>
            <p>
              {form.picked
                ? 'Confira o telefone. Salvar atualiza o cadastro, não cria outra pessoa.'
                : form.id
                  ? 'Os dados valem para todas as viagens desta pessoa.'
                  : 'A pessoa entra na lista geral.'}
            </p>
            <PersonForm
              value={form}
              onChange={setForm}
              onCancel={() => setForm(null)}
              submitLabel="Salvar"
              saving={saving}
              people={people}
            />
          </form>
        </div>
        </DialogPortal>
      )}
    </div>
  );
}

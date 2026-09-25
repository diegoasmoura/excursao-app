import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { api } from '../lib/api';
import { placeKey, titleCaseName } from '../lib/format';
import { formatPassengerPhone, inferDocType } from '../lib/passengerDisplay';
import DocumentCell from './DocumentCell';
import PassengerTable from './PassengerTable';
import PersonForm, { emptyPersonForm } from './PersonForm';
import TripHighlights from './TripHighlights';

export default function TripDetails({ trip, highlightPersonId, onBack }) {
  const confirm = useConfirm();
  const [current] = useState(trip);
  const [passengers, setPassengers] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    let active = true;
    Promise.all([api.getPassengers(current.id), api.getPeople()]).then(([seats, directory]) => {
      if (!active) return;
      if (!seats.error) setPassengers(seats.data ?? []);
      if (!directory.error) setPeople(directory.data ?? []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [current.id]);

  const taken = useMemo(() => new Set(passengers.map((seat) => seat.person_id)), [passengers]);
  const term = query.trim().toLowerCase();
  const passengerMatches = useMemo(() => {
    if (!term) return passengers;
    return passengers.filter((seat) =>
      [seat.name, seat.phone, seat.rg].some((value) => (value || '').toLowerCase().includes(term)),
    );
  }, [passengers, term]);
  const matches = useMemo(() => {
    if (!term) return [];
    return people
      .filter((person) => !taken.has(person.id))
      .filter((person) =>
        [person.name, person.phone, person.rg].some((value) =>
          (value || '').toLowerCase().includes(term),
        ),
      )
      .slice(0, 8);
  }, [people, term, taken]);
  const showDirectory = Boolean(term && passengerMatches.length === 0);

  const addExisting = async (person) => {
    const { data, error } = await api.addPassenger(current.id, { person_id: person.id, is_paid: false });
    if (error) {
      showFeedback('warning', error.message);
      return;
    }
    setPassengers([...passengers, data]);
    setQuery('');
    showFeedback('success', `${person.name} entrou nesta viagem.`);
  };

  const startCreate = (name = '') => {
    setDraft({ ...emptyPersonForm, name, id: null });
  };

  const startEdit = (seat) => {
    setQuery('');
    setDraft({
      id: seat.person_id,
      name: titleCaseName(seat.name),
      phone: seat.phone || '',
      rg: seat.rg || '',
      doc_type: seat.doc_type || inferDocType(seat.rg),
      reference_point: titleCaseName(seat.reference_point),
    });
  };

  const savePerson = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      name: draft.name,
      phone: draft.phone,
      rg: draft.rg,
      doc_type: draft.doc_type,
      reference_point: draft.reference_point,
    };

    if (draft.picked && draft.id) {
      const { error } = await api.addPassenger(current.id, { person_id: draft.id, is_paid: false });
      setSaving(false);
      if (error) {
        showFeedback('warning', error.message);
        return;
      }
      const seats = await api.getPassengers(current.id);
      if (!seats.error) setPassengers(seats.data ?? []);
      setDraft(null);
      setQuery('');
      showFeedback('success', `${draft.name} entrou nesta viagem.`);
      return;
    }

    if (draft.id) {
      const { data, error } = await api.updatePerson(draft.id, payload);
      setSaving(false);
      if (error) {
        showFeedback('warning', error.message);
        return;
      }
      setPeople(people.map((person) => (person.id === data.id ? { ...person, ...data } : person)));
      setPassengers(
        passengers.map((seat) =>
          seat.person_id === data.id
            ? { ...seat, name: data.name, phone: data.phone, rg: data.rg, doc_type: data.doc_type, reference_point: data.reference_point }
            : seat,
        ),
      );
      setDraft(null);
      showFeedback('success', 'Dados da pessoa atualizados.');
      return;
    }

    const { data, error } = await api.addPassenger(current.id, { ...payload, is_paid: false });
    setSaving(false);
    if (error) {
      showFeedback('warning', error.message);
      return;
    }
    setPassengers([...passengers, data]);
    setPeople([...people, { id: data.person_id, name: data.name, phone: data.phone, rg: data.rg, doc_type: data.doc_type }]);
    setDraft(null);
    setQuery('');
    showFeedback('success', 'Pessoa cadastrada e colocada nesta viagem.');
  };

  const togglePaid = async (seat) => {
    const next = !seat.is_paid;
    const { error } = await api.setPassengerPayment(seat.id, next);
    if (error) {
      showFeedback('warning', error.message);
      return;
    }
    setPassengers(passengers.map((item) => (item.id === seat.id ? { ...item, is_paid: next } : item)));
  };

  const removeSeat = async (seat) => {
    const ok = await confirm({
      title: 'Tirar desta viagem',
      message: `Tirar ${titleCaseName(seat.name)} desta viagem? A pessoa continua na lista geral.`,
      confirmLabel: 'Tirar',
    });
    if (!ok) return;
    const { error } = await api.deletePassenger(seat.id);
    if (error) {
      showFeedback('warning', error.message);
      return;
    }
    setPassengers(passengers.filter((item) => item.id !== seat.id));
  };

  const paid = passengers.filter((seat) => seat.is_paid).length;

  return (
    <div className="page-container page-container--trip">
      <div className={`trip-toolbar trip-toolbar--${placeKey(current.origin)}`}>
        <div className="trip-toolbar__line">
          <button type="button" className="btn btn-secondary trip-toolbar__back" onClick={onBack} title="Voltar" aria-label="Voltar">
            <ArrowLeft size={18} aria-hidden />
            <span className="trip-toolbar__back-label">Voltar</span>
          </button>
          <TripHighlights
            origin={current.origin}
            destination={current.destination}
            tripDate={current.trip_date}
            size="lg"
          />
        </div>
        <div className="trip-toolbar__meta">
          <span>
            Vagas {passengers.length} / {current.capacity}
          </span>
          <span>{paid} pagos</span>
        </div>
      </div>

      {feedback && (
        <div className={feedback.type === 'success' ? 'feedback-success' : 'feedback-warning'}>
          <strong>{feedback.text}</strong>
        </div>
      )}

      <div className="panel trip-workspace">
        <div className="trip-workspace__search-head">
          <h2>Pessoas nesta viagem</h2>
          <button type="button" className="btn btn-primary" onClick={() => startCreate()}>
            <UserPlus size={18} color="#fff" aria-hidden />
            Nova pessoa
          </button>
        </div>

        <input
          className="form-input filter-input"
          placeholder="Buscar nesta viagem"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {showDirectory && (
          <div className="people-pick">
            <div className="grid-table-wrap">
              <table className="grid-table people-pick-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Tipo</th>
                    <th>Número</th>
                    <th>Ref.</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {matches.map((person) => (
                    <tr key={person.id} className="is-clickable" onClick={() => addExisting(person)}>
                      <td className="name-cell">{titleCaseName(person.name)}</td>
                      <td>{formatPassengerPhone(person.phone)}</td>
                      <td>
                        <DocumentCell rg={person.rg} docType={person.doc_type} part="type" />
                      </td>
                      <td>
                        <DocumentCell rg={person.rg} docType={person.doc_type} part="number" />
                      </td>
                      <td>{titleCaseName(person.reference_point) || '—'}</td>
                      <td>
                        <button type="button" className="table-link" onClick={() => addExisting(person)}>
                          Colocar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {matches.length === 0 && (
                    <tr className="is-clickable" onClick={() => startCreate(query.trim())}>
                      <td colSpan={6}>Cadastrar e colocar “{query.trim()}”</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {loading ? (
          <p>Carregando...</p>
        ) : passengers.length === 0 && !term ? (
          <p style={{ color: 'var(--color-gray-dark)' }}>Ninguém nesta viagem ainda.</p>
        ) : passengers.length > 0 && !showDirectory ? (
          <PassengerTable
            passengers={passengerMatches}
            highlightPersonId={highlightPersonId}
            onTogglePaid={togglePaid}
            onRemove={removeSeat}
            onEdit={startEdit}
          />
        ) : null}
      </div>

      {draft && (
        <div className="confirm-overlay" onClick={() => setDraft(null)}>
          <form
            className="confirm-dialog confirm-dialog--wide"
            onClick={(event) => event.stopPropagation()}
            onSubmit={savePerson}
          >
            <h2>
              {draft.picked ? 'Pessoa já cadastrada' : draft.id ? 'Editar pessoa' : 'Nova pessoa'}
            </h2>
            <p>
              {draft.picked
                ? 'Confira o telefone e toque em Colocar nesta viagem.'
                : draft.id
                  ? 'Os dados valem para todas as viagens desta pessoa.'
                  : 'A pessoa entra na lista geral e nesta viagem.'}
            </p>
            <PersonForm
              value={draft}
              onChange={setDraft}
              onCancel={() => setDraft(null)}
              submitLabel={draft.picked ? 'Colocar nesta viagem' : draft.id ? 'Salvar' : 'Cadastrar e colocar'}
              saving={saving}
              people={people}
              takenIds={taken}
            />
          </form>
        </div>
      )}
    </div>
  );
}

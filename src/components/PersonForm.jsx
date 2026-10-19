import { useMemo, useState } from 'react';
import { foldText } from '../lib/format';
import {
  DOC_TYPES,
  documentPlaceholder,
  formatPassengerPhone,
  inferDocType,
  maskDocument,
  maskPhone,
} from '../lib/passengerDisplay';
import { filterPeopleSuggestions, filterReferenceSuggestions } from '../lib/peopleSuggest';
import ChoiceField from './ChoiceField';

export const emptyPersonForm = {
  name: '',
  phone: '',
  rg: '',
  doc_type: 'CPF',
  reference_point: '',
  reference_point_back: '',
};

function ReferenceField({ label, field, listId, value, people, onChange }) {
  const [typing, setTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestions = useMemo(
    () => (typing ? filterReferenceSuggestions(people, value, field) : []),
    [typing, people, value, field],
  );

  const pick = (labelText) => {
    onChange(labelText);
    setTyping(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event) => {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pick(suggestions[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setActiveIndex(-1);
    }
  };

  return (
    <div className="form-group person-form__reference">
      <label className="form-label" htmlFor={listId}>{label}</label>
      <input
        id={listId}
        className="form-input"
        autoComplete="off"
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls={`${listId}-list`}
        aria-autocomplete="list"
        placeholder="Ex.: Rodoviária, em frente à praça"
        value={value || ''}
        onChange={(event) => {
          setTyping(true);
          onChange(event.target.value);
          setActiveIndex(-1);
        }}
        onBlur={() => setTyping(false)}
        onKeyDown={onKeyDown}
      />
      {suggestions.length > 0 && (
        <div className="person-form__suggest" id={`${listId}-list`}>
          <p className="person-form__suggest-hint">Já usado — escolher para padronizar</p>
          {suggestions.map((item, index) => (
            <button
              key={item}
              type="button"
              className={`person-form__suggest-item ${index === activeIndex ? 'is-active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => pick(item)}
            >
              <strong>{item}</strong>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PersonForm({
  value,
  onChange,
  onCancel,
  submitLabel = 'Salvar',
  saving = false,
  people = [],
  takenIds,
}) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const set = (patch) => onChange({ ...value, ...patch });
  const editingOnly = Boolean(value.id && !value.picked);
  const suggestions = useMemo(
    () => (editingOnly ? [] : filterPeopleSuggestions(people, value.name)),
    [editingOnly, people, value.name],
  );
  const taken = takenIds instanceof Set ? takenIds : new Set(takenIds || []);

  const pickPerson = (person) => {
    if (taken.has(person.id)) return;
    onChange({
      ...value,
      id: person.id,
      name: person.name || '',
      phone: maskPhone(person.phone || ''),
      rg: maskDocument(person.rg || '', person.doc_type || inferDocType(person.rg)),
      doc_type: person.doc_type || inferDocType(person.rg),
      reference_point: person.reference_point || '',
      reference_point_back: person.reference_point_back || '',
      picked: true,
      pickedName: person.name,
    });
    setActiveIndex(-1);
  };

  const changeName = (raw) => {
    const name = raw;
    const patch = { name };
    if (value.picked && foldText(name) !== foldText(value.pickedName)) {
      patch.id = null;
      patch.picked = false;
      patch.pickedName = undefined;
    }
    set(patch);
    setActiveIndex(-1);
  };

  const onNameKeyDown = (event) => {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
      return;
    }
    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pickPerson(suggestions[activeIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setActiveIndex(-1);
    }
  };

  return (
    <>
      <div className="form-group person-form__name">
        <label className="form-label">Nome</label>
        <input
          required
          className="form-input"
          autoComplete="off"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls="person-suggest-list"
          aria-autocomplete="list"
          value={value.name}
          onChange={(event) => changeName(event.target.value)}
          onKeyDown={onNameKeyDown}
        />
        {suggestions.length > 0 && (
          <div className="person-form__suggest" id="person-suggest-list">
            <p className="person-form__suggest-hint">Já cadastrada — escolher para usar</p>
            {suggestions.map((person, index) => {
              const already = taken.has(person.id);
              const docType = person.doc_type || inferDocType(person.rg);
              const document = person.rg ? `${docType} ${maskDocument(person.rg, docType)}` : '';
              return (
                <button
                  key={person.id}
                  type="button"
                  className={`person-form__suggest-item ${index === activeIndex ? 'is-active' : ''} ${already ? 'is-taken' : ''}`}
                  disabled={already}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickPerson(person)}
                >
                  <strong>{person.name}</strong>
                  <span className="person-form__suggest-meta">
                    <span>{already ? 'Já nesta viagem' : formatPassengerPhone(person.phone)}</span>
                    {document ? <span>{document}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="week-dialog__row person-form__row">
        <div className="form-group">
          <label className="form-label">Telefone</label>
          <input
            className="form-input"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(34) 98886-1577"
            value={maskPhone(value.phone)}
            onChange={(event) => set({ phone: maskPhone(event.target.value) })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Tipo de documento</label>
          <ChoiceField
            value={value.doc_type || 'CPF'}
            options={DOC_TYPES}
            onChange={(doc_type) => set({ doc_type, rg: maskDocument(value.rg, doc_type) })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Número</label>
          <input
            className="form-input"
            inputMode={value.doc_type === 'Outro' ? 'text' : 'numeric'}
            placeholder={documentPlaceholder(value.doc_type)}
            value={maskDocument(value.rg, value.doc_type)}
            onChange={(event) => set({ rg: maskDocument(event.target.value, value.doc_type) })}
          />
        </div>
      </div>
      <ReferenceField
        label="Ponto em Uberlândia → Pirapora"
        field="reference_point"
        listId="person-ref-going"
        value={value.reference_point}
        people={people}
        onChange={(reference_point) => set({ reference_point })}
      />
      <ReferenceField
        label="Ponto em Pirapora → Uberlândia"
        field="reference_point_back"
        listId="person-ref-back"
        value={value.reference_point_back}
        people={people}
        onChange={(reference_point_back) => set({ reference_point_back })}
      />
      <div className="confirm-dialog__actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </>
  );
}

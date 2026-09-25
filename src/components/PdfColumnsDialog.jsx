import { useState } from 'react';

const STORAGE_KEY = 'excursao-pdf-columns';

export const DEFAULT_PDF_COLUMNS = {
  number: true,
  name: true,
  document: true,
  ref: true,
  payment: false,
};

const OPTIONS = [
  { key: 'number', label: 'Número' },
  { key: 'name', label: 'Nome' },
  { key: 'document', label: 'Documento' },
  { key: 'ref', label: 'Ref.' },
  { key: 'payment', label: 'Pagamento' },
];

export function loadPdfColumns() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
    return OPTIONS.reduce((columns, option) => {
      columns[option.key] = typeof stored?.[option.key] === 'boolean'
        ? stored[option.key]
        : DEFAULT_PDF_COLUMNS[option.key];
      return columns;
    }, {});
  } catch {
    return { ...DEFAULT_PDF_COLUMNS };
  }
}

export function savePdfColumns(columns) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  } catch {
    // lembrar é só um extra
  }
}

export default function PdfColumnsDialog({ onClose, onConfirm }) {
  const [columns, setColumns] = useState(loadPdfColumns);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const selectedCount = OPTIONS.filter((option) => columns[option.key]).length;

  const toggle = (key) => {
    setError(null);
    setColumns((current) => ({ ...current, [key]: !current[key] }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (selectedCount < 1) {
      setError('Marque pelo menos uma coluna.');
      return;
    }
    savePdfColumns(columns);
    setSaving(true);
    setError(null);
    try {
      await onConfirm(columns);
      onClose();
    } catch (confirmError) {
      setError(confirmError.message || 'Não foi possível baixar a lista.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <form
        className="confirm-dialog"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <h2>Colunas do PDF</h2>
        <p>Marque o que entra na lista. A escolha fica lembrada.</p>
        <div className="pdf-columns">
          {OPTIONS.map((option) => {
            const on = Boolean(columns[option.key]);
            return (
              <label
                key={option.key}
                className={`pdf-columns__row${on ? ' is-on' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(option.key)}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
        {error && (
          <div className="feedback-warning">
            <strong>{error}</strong>
          </div>
        )}
        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || selectedCount < 1}>
            {saving ? 'Baixando...' : 'Baixar lista'}
          </button>
        </div>
      </form>
    </div>
  );
}

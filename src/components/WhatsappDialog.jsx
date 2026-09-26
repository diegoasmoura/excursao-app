import { useState } from 'react';
import DialogPortal from './DialogPortal';
import { api } from '../lib/api';
import { maskPhone } from '../lib/passengerDisplay';

export default function WhatsappDialog({ initialPhone = '', onClose, onSaved }) {
  const [phone, setPhone] = useState(maskPhone(initialPhone));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const { data, error: saveError } = await api.saveWhatsapp(phone);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onSaved?.(data.phone);
  };

  return (
    <DialogPortal>
    <div className="confirm-overlay" onClick={onClose}>
      <form
        className="confirm-dialog confirm-dialog--settings"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <h2>WhatsApp</h2>
        <p>Número para onde a lista da viagem será enviada.</p>
        <div className="form-group">
          <label className="form-label">Número</label>
          <input
            className="form-input"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="(34) 98886-1577"
            value={phone}
            onChange={(event) => setPhone(maskPhone(event.target.value))}
          />
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
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
    </DialogPortal>
  );
}

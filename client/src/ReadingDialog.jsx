import { useEffect, useRef, useState } from 'react';
import { SLOTS, slotLabel } from '../../shared/slots.js';
import { ErrorText, formatDate, Icon } from './ui.jsx';

export default function ReadingDialog({ action, today, onClose, onSave }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { reading, kind } = action;
  const deleting = kind === 'delete';
  const title = { add: 'Add reading', edit: 'Edit reading', delete: 'Delete reading?' }[kind];

  useEffect(() => { dialog.current.showModal(); }, []);

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const value = values.get('value');
    const payload = deleting ? undefined : {
      date: values.get('date'), slot: Number(values.get('slot')), value: value === '' ? null : Number(value),
    };
    setBusy(true);
    setError('');
    try {
      await onSave(payload);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={(event) => {
    event.preventDefault();
    if (!busy) onClose();
  }}>
    <div className="dialog-title"><h2 id="dialog-title">{title}</h2>
      <button className="icon-button" aria-label="Close" disabled={busy} onClick={onClose}><Icon name="close" /></button>
    </div>
    <form onSubmit={submit}>
      {deleting
        ? <p className="muted">Remove the {slotLabel(reading.slot)} reading of {reading.value} mg/dl on {formatDate(reading.date)}?</p>
        : <>
          <label>Date<input name="date" type="date" required max={today} defaultValue={reading.date} /></label>
          <label>Time slot<select name="slot" defaultValue={reading.slot}>
            {SLOTS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select></label>
          <label>Glucose (mg/dl)<input name="value" type="number" inputMode="numeric" min="40" max="600"
            step="1" required defaultValue={reading.value} placeholder="e.g. 105" /></label>
          <p className="muted input-hint">Enter a whole number from 40 to 600 mg/dl.</p>
        </>}
      <ErrorText>{error}</ErrorText>
      <div className="dialog-actions">
        <button className="button secondary" type="button" disabled={busy} onClick={onClose}>Cancel</button>
        <button className={'button ' + (deleting ? 'danger' : 'primary')} disabled={busy}>
          {busy ? 'Saving…' : deleting ? 'Delete reading' : 'Save reading'}
        </button>
      </div>
    </form>
  </dialog>;
}

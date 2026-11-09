import { useEffect, useRef, useState } from 'react';
import { slotLabel } from '../../shared/slots.js';
import { DatePicker, SlotPicker } from './Pickers.jsx';
import { ErrorText, formatDate, Icon } from './ui.jsx';

export default function ReadingDialog({ action, today, onClose, onSave }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { reading, kind } = action;
  const [date, setDate] = useState(reading.date);
  const [slot, setSlot] = useState(reading.slot);
  const deleting = kind === 'delete';
  const title = { add: 'Add reading', edit: 'Edit reading', delete: 'Delete reading?' }[kind];

  useEffect(() => { dialog.current.showModal(); }, []);

  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const value = values.get('value');
    const payload = deleting ? undefined : {
      date, slot, value: value === '' ? null : Number(value),
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
          <div className="picker-field"><span className="picker-label">Date</span>
            <DatePicker label="Date" value={date} max={today} onChange={setDate} inline disabled={busy} />
          </div>
          <div className="picker-field"><span className="picker-label">Time slot</span>
            <SlotPicker value={slot} onChange={setSlot} disabled={busy} />
          </div>
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

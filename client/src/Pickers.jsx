import { useEffect, useId, useRef, useState } from 'react';
import { SLOTS } from '../../shared/slots.js';
import { formatDate, Icon } from './ui.jsx';

function Picker({ label, value, icon, inline, disabled, children }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const id = useId();
  const visible = open && !disabled;

  function close() {
    setOpen(false);
    trigger.current.focus();
  }

  useEffect(() => {
    if (!visible) return;
    function dismiss(event) {
      if (!root.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [visible]);

  return <div className={`picker${inline ? ' picker-inline' : ''}`} ref={root}
    onBlur={(event) => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}
    onKeyDown={(event) => {
      if (event.key !== 'Escape' || !visible) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    }}>
    <button ref={trigger} type="button" className="picker-trigger" disabled={disabled}
      aria-label={`${label}, ${value}`} aria-expanded={visible} aria-controls={visible ? id : undefined}
      onClick={() => setOpen(!visible)}>
      {value}<Icon name={icon} size={17} />
    </button>
    {visible && <div className="picker-menu" id={id}>{children(close)}</div>}
  </div>;
}

const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const keyOffsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const earliest = '0001-01-01';
const parse = (date) => new Date(date + 'T00:00:00Z');
const iso = (date) => date.toISOString().slice(0, 10);

function offsetDate(value, days) {
  const date = parse(value);
  date.setUTCDate(date.getUTCDate() + days);
  return iso(date);
}

function Calendar({ value, max, onSelect }) {
  const [activeDate, setActiveDate] = useState(value);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const requestedFocus = useRef(false);
  const activeButton = useRef(null);
  const month = activeDate.slice(0, 7);
  const first = parse(month + '-01');
  const offset = (first.getUTCDay() + 6) % 7;
  const end = new Date(first);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  const dayCount = end.getUTCDate();

  useEffect(() => {
    if (!requestedFocus.current) return;
    requestedFocus.current = false;
    activeButton.current?.focus();
  }, [activeDate]);

  function changeMonth(delta) {
    const target = new Date(first);
    target.setUTCMonth(target.getUTCMonth() + delta);
    setActiveDate(iso(target));
  }

  function moveFocus(event, date) {
    if (!Object.hasOwn(keyOffsets, event.key)) return;
    event.preventDefault();
    const next = offsetDate(date, keyOffsets[event.key]);
    if (next < earliest || next > max) return;
    requestedFocus.current = true;
    setActiveDate(next);
  }

  function applyTypedDate() {
    const date = typed.trim();
    const parsed = parse(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.valueOf()) ||
        iso(parsed) !== date || date < earliest || date > max) {
      setError('Enter a valid date on or before today.');
      return;
    }
    onSelect(date);
  }

  return <>
    <div className="calendar-heading">
      <button type="button" className="picker-option" aria-label="Previous month"
        aria-disabled={month === '0001-01'} onClick={() => month !== '0001-01' && changeMonth(-1)}>
        <Icon name="previous" size={18} />
      </button>
      <strong aria-live="polite">{monthFormat.format(first)}</strong>
      <button type="button" className="picker-option" aria-label="Next month"
        aria-disabled={month >= max.slice(0, 7)} onClick={() => month < max.slice(0, 7) && changeMonth(1)}>
        <Icon name="next" size={18} />
      </button>
    </div>
    <div className="calendar-grid" role="group" aria-label="Days of the month">
      {weekdays.map((day) => <span key={day} aria-hidden="true">{day.slice(0, 2)}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
      {Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1;
        const date = `${month}-${String(day).padStart(2, '0')}`;
        return <button key={date} ref={date === activeDate ? activeButton : undefined}
          type="button" className="picker-option" disabled={date > max}
          tabIndex={date === activeDate ? 0 : -1} aria-label={formatDate(date)}
          aria-pressed={date === value} aria-current={date === max ? 'date' : undefined}
          onKeyDown={(event) => moveFocus(event, date)} onClick={() => onSelect(date)}>{day}</button>;
      })}
    </div>
    <div className="calendar-footer">
      <button type="button" className="text-button" onClick={() => onSelect(max)}>Today</button>
      <div className="calendar-jump">
        <input type="text" aria-label="Jump to date in year-month-day format" placeholder="YYYY-MM-DD"
          value={typed} maxLength={10} onChange={(event) => { setTyped(event.target.value); setError(''); }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            applyTypedDate();
          }} />
        <button type="button" className="text-button" onClick={applyTypedDate}>Go</button>
      </div>
    </div>
    {error && <p className="picker-error" role="alert">{error}</p>}
  </>;
}

export function DatePicker({ label, value, max, onChange, inline, disabled }) {
  return <Picker label={label} value={formatDate(value)} icon="calendar" inline={inline} disabled={disabled}>
    {(close) => <Calendar value={value} max={max} onSelect={(date) => { onChange(date); close(); }} />}
  </Picker>;
}

export function SlotPicker({ value, onChange, disabled }) {
  const selected = SLOTS.find(({ id }) => id === value);
  return <Picker label="Time slot" value={selected.label} icon="chevron" inline disabled={disabled}>
    {(close) => <div className="slot-options" role="group" aria-label="Time slots">
      {SLOTS.map(({ id, label, icon }) => <button key={id} type="button" className="picker-option"
        aria-pressed={id === value} onClick={() => { onChange(id); close(); }}>
        <Icon name={icon} size={17} />{label}{id === value && <Icon name="check" size={16} />}
      </button>)}
    </div>}
  </Picker>;
}

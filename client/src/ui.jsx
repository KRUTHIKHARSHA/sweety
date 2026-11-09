import sweetyMark from './assets/sweety-mark.svg';

const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  list: 'M9 5h12 M9 12h12 M9 19h12 M3 5h1 M3 12h1 M3 19h1',
  chart: 'M3 3v18h18 M8 16v-4 M13 16V8 M18 16v-6',
  exit: 'M11 4H5v16h6 M10 12h11 M17 8l4 4-4 4',
  plus: 'M12 5v14 M5 12h14',
  sunrise: 'M3 18h18 M7 18a5 5 0 0 1 10 0 M12 3v7 M9 6l3-3 3 3 M4 11l2 2 M20 11l-2 2',
  coffee: 'M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z M17 9h2a2 2 0 0 1 0 4h-2 M3 21h17 M8 3v2 M13 3v2',
  sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20.9 13.35A9 9 0 0 1 10.65 3.1 9 9 0 1 0 20.9 13.35Z',
  edit: 'M13.5 6.5l4 4 M4 20l4-.7L20 7.3 16.7 4 4.7 16Z',
  trash: 'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
  close: 'M6 6l12 12 M18 6 6 18',
  calendar: 'M4 5h16v15H4z M4 10h16 M8 3v4 M16 3v4',
  previous: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  chevron: 'M6 9l6 6 6-6',
  person: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M4 21v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1',
  check: 'M5 12l4 4L19 6',
};

export function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>;
}

export function Brand() {
  return <div className="brand"><img className="brand-icon" src={sweetyMark} alt="" width="43" height="43" />
    <div><strong>Sweety</strong><small>GLUCOSE TRACKER</small></div>
  </div>;
}

const avatarPalettes = ['sage', 'clay', 'lavender', 'gold'];

export function Avatar({ user }) {
  const palette = avatarPalettes[user.id % avatarPalettes.length];
  return <span className={`avatar avatar-${palette}`} aria-hidden="true"><Icon name="person" size={19} /></span>;
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});
export function formatDate(date) {
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isNaN(parsed.valueOf()) ? date : dateFormat.format(parsed);
}

export function ErrorText({ children }) {
  return children ? <p className="error" role="alert">{children}</p> : null;
}

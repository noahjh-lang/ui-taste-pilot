/** Framework-free display helpers, shared by web (and later mobile). */

/** Map the ranking score (-1..1) to a 0-100 "match" for display. */
export function scoreToPercent(total: number) {
  return Math.round(((Math.max(-1, Math.min(1, total)) + 1) / 2) * 100);
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const DAY_MS = 86_400_000;

/** "today", "yesterday", "3 days ago", or a short date. */
export function formatRelativeDate(iso: string, now: Date = new Date()) {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / DAY_MS);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days === -1) return 'tomorrow';
  if (days > 1 && days < 7) return `${days} days ago`;
  if (days < -1 && days > -7) return `in ${-days} days`;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

export function formatDate(iso: string) {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Local `YYYY-MM-DD`. */
export function toIsoDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/** Monday of the week containing `isoDate`. */
export function startOfWeek(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  const offset = (d.getDay() + 6) % 7;
  return addDays(isoDate, -offset);
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

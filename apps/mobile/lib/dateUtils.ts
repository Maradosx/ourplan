function pad(n: number) { return String(n).padStart(2, '0'); }

/** Returns local date string YYYY-MM-DD (avoids UTC offset bug) */
export function formatDate(date: Date | string): string {
  let d: Date;
  if (typeof date === 'string') {
    // A bare YYYY-MM-DD must be read as a LOCAL calendar date. `new Date('2026-06-22')`
    // parses as UTC midnight, so getDate() rolls back a day in negative-UTC timezones.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(date);
  } else {
    d = date;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function getWeekDays(baseDate: Date = new Date()): Date[] {
  const dow = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(baseDate.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return formatDate(typeof a === 'string' ? new Date(a) : a) === formatDate(typeof b === 'string' ? new Date(b) : b);
}

export function getDurationLabel(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

/** Today's date string in local time */
export function todayString(): string {
  return formatDate(new Date());
}

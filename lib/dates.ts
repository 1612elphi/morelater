/**
 * Get the ISO week number for a given date.
 * ISO 8601: week starts Monday, week 1 contains Jan 4th.
 */
export function getISOWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Get the Monday of the ISO week containing the given date.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get all weeks (as arrays of 7 dates, Mon-Sun) for a given month.
 * Includes partial weeks at start/end that overlap with the month.
 */
export function getMonthWeeks(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startMonday = getWeekStart(firstDay);
  const weeks: Date[][] = [];

  const current = new Date(startMonday);
  while (current <= lastDay || current.getDay() !== 1) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    if (current > lastDay && current.getDay() === 1) break;
  }

  return weeks;
}

/**
 * Format a date as ISO 8601 date string (YYYY-MM-DD).
 */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Check if two dates are the same calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return toDateString(a) === toDateString(b);
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Utility functions for timezone-safe date manipulations.
 * Avoids UTC date roll when converting between local calendar dates and ISO strings.
 */

/**
 * Returns a date string in "YYYY-MM-DD" format using the user's local timezone.
 * Unlike date.toISOString().slice(0, 10), this will not jump to tomorrow in evening hours
 * for UTC-negative timezones (e.g. PDT, EST).
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" or ISO date string into local { year, month, day } parts
 * without constructing a UTC midnight Date object (which causes day offsets in Western timezones).
 * Note: `month` is 0-indexed (0 = Jan, 11 = Dec) to match standard JavaScript Date conventions.
 */
export function parseLocalDateParts(dateStr?: string | null): {
  year: number;
  month: number;
  day: number;
} | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed
  const day = parseInt(match[3], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Formats a "YYYY-MM-DD" or ISO string as "MM/DD/YYYY".
 */
export function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = parseLocalDateParts(dateStr);
  if (!parts) return dateStr;
  const mm = String(parts.month + 1).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${mm}/${dd}/${parts.year}`;
}

/**
 * Converts a "YYYY-MM-DD" date string to an ISO string at midday UTC (12:00:00.000Z).
 * Midday prevents timezone drift across any international timezone from UTC-12 to UTC+14.
 */
export function toMiddayIso(dateStr: string): string {
  const parts = parseLocalDateParts(dateStr);
  if (!parts) {
    return new Date(dateStr).toISOString();
  }
  const mm = String(parts.month + 1).padStart(2, '0');
  const dd = String(parts.day).padStart(2, '0');
  return `${parts.year}-${mm}-${dd}T12:00:00.000Z`;
}

/**
 * Computes calendar day difference (endDate - startDate).
 */
export function diffCalendarDays(startDateStr: string, endDateStr: string): number {
  const startParts = parseLocalDateParts(startDateStr);
  const endParts = parseLocalDateParts(endDateStr);

  if (!startParts || !endParts) {
    const s = new Date(startDateStr).getTime();
    const e = new Date(endDateStr).getTime();
    return Math.max(1, Math.round((e - s) / 864e5));
  }

  const startUtc = Date.UTC(startParts.year, startParts.month, startParts.day);
  const endUtc = Date.UTC(endParts.year, endParts.month, endParts.day);
  return Math.round((endUtc - startUtc) / 864e5);
}

/**
 * Adds a number of days to a "YYYY-MM-DD" date string and returns the new "YYYY-MM-DD" string.
 */
export function addDaysToLocalDate(dateStr: string, days: number): string {
  const parts = parseLocalDateParts(dateStr);
  if (!parts) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return getLocalDateString(d);
  }
  const dateObj = new Date(parts.year, parts.month, parts.day + days);
  return getLocalDateString(dateObj);
}


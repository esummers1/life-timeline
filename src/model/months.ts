import type { DateKey, MonthKey } from './types';

/*
 * Time on the timeline is measured in months. A "month index" is an integer
 * `year * 12 + zeroBasedMonth`; a "position" is a fractional month index, so
 * 1990-04-16 sits halfway through April 1990.
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type Season = 'Winter' | 'Spring' | 'Summer' | 'Autumn';

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export function parseMonthKey(key: MonthKey): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return Number(match[1]) * 12 + month - 1;
}

export function toMonthKey(monthIndex: number): MonthKey {
  const { year, month } = splitMonthIndex(monthIndex);
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}`;
}

export function splitMonthIndex(monthIndex: number): { year: number; month: number } {
  const year = Math.floor(monthIndex / 12);
  return { year, month: monthIndex - year * 12 };
}

/** Formats a month index as e.g. "May 2010", or "May" when `includeYear` is false. */
export function formatMonth(monthIndex: number, { short = true, includeYear = true } = {}): string {
  const { year, month } = splitMonthIndex(monthIndex);
  const name = short ? MONTH_NAMES[month].slice(0, 3) : MONTH_NAMES[month];
  return includeYear ? `${name} ${year}` : name;
}

export function monthIndexOfDate(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Parses a `YYYY-MM-DD` key into a zero-based-month calendar date, rejecting impossible dates. */
export function parseDateKey(key: DateKey): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/**
 * The fractional month position of a day. Days that don't exist in the month
 * (a 29 February birthday in a non-leap year) are clamped to the month's last day.
 */
export function positionOfDay(year: number, month: number, day: number): number {
  const monthLength = daysInMonth(year, month);
  return year * 12 + month + (Math.min(day, monthLength) - 1) / monthLength;
}

export function positionOfDate(date: Date): number {
  return positionOfDay(date.getFullYear(), date.getMonth(), date.getDate());
}

export function birthdayPosition(birthday: CalendarDate, year: number): number {
  return positionOfDay(year, birthday.month, birthday.day);
}

/** Whole years of age at a timeline position, or null before birth. */
export function ageAt(birthday: CalendarDate, position: number): number | null {
  if (position < birthdayPosition(birthday, birthday.year)) return null;
  const year = Math.floor(position / 12);
  return year - birthday.year - (position < birthdayPosition(birthday, year) ? 1 : 0);
}

/** Meteorological seasons for the northern hemisphere: spring starts in March. */
export function seasonOf(monthIndex: number): Season {
  const { month } = splitMonthIndex(monthIndex);
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Autumn';
  return 'Winter';
}

import { describe, expect, it } from 'vitest';
import {
  ageAt, formatMonth, isPlausibleBirthday, parseDateKey, parseMonthKey, positionOfDay, seasonOf, toMonthKey,
} from './months';

describe('month keys', () => {
  it('round-trips between keys and indices', () => {
    const index = parseMonthKey('2010-05')!;
    expect(index).toBe(2010 * 12 + 4);
    expect(toMonthKey(index)).toBe('2010-05');
    expect(formatMonth(index)).toBe('May 2010');
    expect(formatMonth(index, { short: false })).toBe('May 2010');
    expect(formatMonth(parseMonthKey('2023-09')!, { short: false })).toBe('September 2023');
  });

  it('rejects malformed keys', () => {
    expect(parseMonthKey('2010-13')).toBeNull();
    expect(parseMonthKey('2010-5')).toBeNull();
    expect(parseMonthKey('May 2010')).toBeNull();
  });
});

describe('parseDateKey', () => {
  it('rejects impossible dates', () => {
    expect(parseDateKey('1990-04-12')).toEqual({ year: 1990, month: 3, day: 12 });
    expect(parseDateKey('2023-02-29')).toBeNull();
    expect(parseDateKey('2024-02-29')).not.toBeNull();
  });
});

describe('isPlausibleBirthday', () => {
  const today = new Date(2026, 9, 21);

  it('accepts clearing the birthday and real past dates', () => {
    expect(isPlausibleBirthday('', today)).toBe(true);
    expect(isPlausibleBirthday('1990-04-12', today)).toBe(true);
    expect(isPlausibleBirthday('2026-10-21', today)).toBe(true);
  });

  it('rejects half-typed years, future dates and impossible dates', () => {
    expect(isPlausibleBirthday('0001-04-12', today)).toBe(false);
    expect(isPlausibleBirthday('0199-04-12', today)).toBe(false);
    expect(isPlausibleBirthday('2026-10-22', today)).toBe(false);
    expect(isPlausibleBirthday('1990-02-30', today)).toBe(false);
  });
});

describe('ageAt', () => {
  const birthday = parseDateKey('1990-04-12')!;

  it('is null before birth', () => {
    expect(ageAt(birthday, positionOfDay(1990, 3, 11))).toBeNull();
  });

  it('increments exactly on the birthday', () => {
    expect(ageAt(birthday, positionOfDay(1990, 3, 12))).toBe(0);
    expect(ageAt(birthday, positionOfDay(2023, 3, 11))).toBe(32);
    expect(ageAt(birthday, positionOfDay(2023, 3, 12))).toBe(33);
    expect(ageAt(birthday, positionOfDay(2023, 11, 31))).toBe(33);
  });

  it('handles leap-day birthdays in non-leap years', () => {
    const leapling = parseDateKey('2000-02-29')!;
    expect(ageAt(leapling, positionOfDay(2001, 1, 27))).toBe(0);
    expect(ageAt(leapling, positionOfDay(2001, 1, 28))).toBe(1);
  });
});

describe('seasonOf', () => {
  it('uses meteorological seasons', () => {
    expect(seasonOf(parseMonthKey('2023-02')!)).toBe('Winter');
    expect(seasonOf(parseMonthKey('2023-03')!)).toBe('Spring');
    expect(seasonOf(parseMonthKey('2023-08')!)).toBe('Summer');
    expect(seasonOf(parseMonthKey('2023-11')!)).toBe('Autumn');
    expect(seasonOf(parseMonthKey('2023-12')!)).toBe('Winter');
  });
});

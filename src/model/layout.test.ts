import { describe, expect, it } from 'vitest';
import { itemSpan, itemsActiveAt, packLane, timelineRange, zoomToFill } from './layout';
import { parseMonthKey } from './months';
import type { LifeItem, TimelineData } from './types';

const nowMonth = parseMonthKey('2026-10')!;

function item(id: string, start: string, end: string | null): LifeItem {
  return { id, categoryId: 'home', label: id, start, end, color: 'blue' };
}

describe('itemSpan', () => {
  it('includes the whole end month', () => {
    expect(itemSpan(item('a', '2010-05', '2017-06'), nowMonth)).toEqual({
      start: parseMonthKey('2010-05'),
      end: parseMonthKey('2017-07'),
    });
  });

  it('runs ongoing items through the current month', () => {
    expect(itemSpan(item('a', '2020-01', null), nowMonth).end).toBe(nowMonth + 1);
    expect(itemSpan(item('a', '2030-01', null), nowMonth)).toEqual({
      start: parseMonthKey('2030-01'),
      end: parseMonthKey('2030-02'),
    });
  });
});

describe('packLane', () => {
  const rowsById = (items: LifeItem[]) =>
    Object.fromEntries(packLane(items, nowMonth).placed.map(({ item: placed, row }) => [placed.id, row]));

  it('keeps back-to-back items on one row', () => {
    const result = packLane([item('b', '2017-07', null), item('a', '2010-05', '2017-06')], nowMonth);
    expect(result.rowCount).toBe(1);
    expect(result.placed.map(({ item: placed }) => placed.id)).toEqual(['a', 'b']);
  });

  it('wraps overlapping items onto new rows and reuses freed rows', () => {
    expect(rowsById([
      item('long', '2010-01', '2015-12'),
      item('clash', '2012-01', '2012-12'),
      item('after-clash', '2013-01', '2013-06'),
      item('clash-both', '2013-03', '2013-04'),
      item('after-long', '2016-01', null),
    ])).toEqual({ long: 0, clash: 1, 'after-clash': 1, 'clash-both': 2, 'after-long': 0 });
  });

  it('places the longer item first when two start together', () => {
    expect(rowsById([item('short', '2010-01', '2010-03'), item('long', '2010-01', '2012-01')]))
      .toEqual({ long: 0, short: 1 });
  });

  it('reports one row for an empty lane', () => {
    expect(packLane([], nowMonth)).toEqual({ placed: [], rowCount: 1 });
  });
});

describe('timelineRange', () => {
  const data: TimelineData = { version: 1, birthday: null, categories: [], items: [] };

  it('covers whole years from five years ago to at least a year ahead', () => {
    expect(timelineRange(data, nowMonth)).toEqual({ start: 2021 * 12, end: 2028 * 12 });
  });

  it('extends back to birth and the earliest item, and forward past the latest item', () => {
    const range = timelineRange(
      { ...data, birthday: '1990-04-12', items: [item('a', '1985-06', '2030-02')] },
      nowMonth,
    );
    expect(range).toEqual({ start: 1985 * 12, end: 2032 * 12 });
  });
});

describe('zoomToFill', () => {
  const tenYears = { start: 2016 * 12, end: 2026 * 12 };

  it('stretches the range to fill the track', () => {
    expect(zoomToFill(1200, tenYears, 3, 120)).toBe(10);
  });

  it('stays within the zoom bounds', () => {
    expect(zoomToFill(120, tenYears, 3, 120)).toBe(3);
    expect(zoomToFill(1_000_000, tenYears, 3, 120)).toBe(120);
  });
});

describe('itemsActiveAt', () => {
  it('finds items covering a month, inclusive of both ends', () => {
    const items = [item('a', '2010-05', '2017-06'), item('b', '2017-07', null)];
    expect(itemsActiveAt(items, parseMonthKey('2017-06')!, nowMonth).map(({ id }) => id)).toEqual(['a']);
    expect(itemsActiveAt(items, parseMonthKey('2017-07')!, nowMonth).map(({ id }) => id)).toEqual(['b']);
    expect(itemsActiveAt(items, nowMonth + 1, nowMonth)).toEqual([]);
  });
});

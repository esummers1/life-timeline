import { parseDateKey, parseMonthKey } from './months';
import type { LifeItem, TimelineData } from './types';

/** A half-open interval of month indices: `start` inclusive, `end` exclusive. */
export interface Span {
  start: number;
  end: number;
}

export interface PlacedItem extends Span {
  item: LifeItem;
  row: number;
}

/**
 * The months an item covers. Items include their whole end month, and ongoing
 * items run up to and including the current month (or their start month, if that
 * is in the future).
 */
export function itemSpan(item: LifeItem, nowMonth: number): Span {
  const start = parseMonthKey(item.start) ?? nowMonth;
  const end = item.end === null ? Math.max(start, nowMonth) : (parseMonthKey(item.end) ?? start);
  return { start, end: end + 1 };
}

/**
 * Assigns each item in a lane to a row so that no two items in a row overlap,
 * the same way a calendar app stacks clashing events. Items are placed in start
 * order (longest first on ties), each into the first row that is free by then.
 */
export function packLane(items: LifeItem[], nowMonth: number): { placed: PlacedItem[]; rowCount: number } {
  const spans = items
    .map((item) => ({ item, ...itemSpan(item, nowMonth) }))
    .sort((first, second) => first.start - second.start || second.end - first.end);
  const rowEnds: number[] = [];
  const placed = spans.map((span) => {
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= span.start);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = span.end;
    return { ...span, row };
  });
  return { placed, rowCount: Math.max(1, rowEnds.length) };
}

/**
 * The span of months to draw: whole calendar years from the earliest of birth,
 * the first item, or five years ago, through at least a year beyond both today
 * and the last item.
 */
export function timelineRange(data: TimelineData, nowMonth: number): Span {
  let earliest = nowMonth - 5 * 12;
  let latest = nowMonth;
  const birthday = data.birthday ? parseDateKey(data.birthday) : null;
  if (birthday) earliest = Math.min(earliest, birthday.year * 12 + birthday.month);
  for (const item of data.items) {
    const span = itemSpan(item, nowMonth);
    earliest = Math.min(earliest, span.start);
    latest = Math.max(latest, span.end - 1);
  }
  return {
    start: Math.floor(earliest / 12) * 12,
    end: (Math.floor((latest + 12) / 12) + 1) * 12,
  };
}

/**
 * The smallest zoom, in pixels per month, at which `range` fills a track
 * `trackWidth` pixels wide, kept within `[minPxPerMonth, maxPxPerMonth]`.
 */
export function zoomToFill(trackWidth: number, range: Span, minPxPerMonth: number, maxPxPerMonth: number): number {
  const fillingPxPerMonth = trackWidth / (range.end - range.start);
  return Math.min(maxPxPerMonth, Math.max(minPxPerMonth, fillingPxPerMonth));
}

export function itemsActiveAt(items: LifeItem[], monthIndex: number, nowMonth: number): LifeItem[] {
  return items.filter((item) => {
    const span = itemSpan(item, nowMonth);
    return span.start <= monthIndex && monthIndex < span.end;
  });
}

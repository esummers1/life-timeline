import type { ColorKey } from './palette';

/** A calendar month in `YYYY-MM` form, e.g. `2010-05`. */
export type MonthKey = string;

/** A calendar date in `YYYY-MM-DD` form, e.g. `1990-04-12`. */
export type DateKey = string;

/** A swimlane grouping related items, e.g. "Home" or "Work". */
export interface Category {
  id: string;
  name: string;
}

/**
 * A period of life within a category. `start` and `end` are inclusive months;
 * an `end` of null means the item is ongoing.
 */
export interface LifeItem {
  id: string;
  categoryId: string;
  label: string;
  start: MonthKey;
  end: MonthKey | null;
  color: ColorKey;
  notes?: string;
}

export interface TimelineData {
  version: 1;
  birthday: DateKey | null;
  categories: Category[];
  items: LifeItem[];
}

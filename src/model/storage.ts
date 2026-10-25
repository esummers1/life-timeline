import { parseDateKey, parseMonthKey } from './months';
import { COLOR_KEYS, isColorKey } from './palette';
import type { Category, LifeItem, TimelineData } from './types';

const TIMELINE_STORAGE_KEY = 'life-timeline:data';

export function createDefaultTimeline(): TimelineData {
  return {
    version: 1,
    birthday: null,
    categories: ['Home', 'Education', 'Work', 'Relationship'].map((name) => ({ id: crypto.randomUUID(), name })),
    items: [],
  };
}

/**
 * Validates untrusted JSON (an imported file or saved state) as timeline data.
 * Throws an Error describing the first problem found. Unknown colours fall back
 * to the first palette colour rather than failing the whole import.
 */
export function parseTimeline(json: unknown): TimelineData {
  if (!isRecord(json) || json.version !== 1) {
    throw new Error('This doesn’t look like a Life Timeline file (expected "version": 1).');
  }
  if (json.birthday !== null && (typeof json.birthday !== 'string' || !parseDateKey(json.birthday))) {
    throw new Error('"birthday" must be null or a date like "1990-04-12".');
  }
  if (!Array.isArray(json.categories) || !Array.isArray(json.items)) {
    throw new Error('"categories" and "items" must both be lists.');
  }

  const categories: Category[] = json.categories.map((category, index) => {
    if (!isRecord(category) || typeof category.id !== 'string' || typeof category.name !== 'string') {
      throw new Error(`Category ${index + 1} needs a string "id" and "name".`);
    }
    return { id: category.id, name: category.name };
  });
  const categoryIds = new Set(categories.map((category) => category.id));

  const items: LifeItem[] = json.items.map((item, index) => {
    const description = `Item ${index + 1}`;
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.label !== 'string') {
      throw new Error(`${description} needs a string "id" and "label".`);
    }
    if (typeof item.categoryId !== 'string' || !categoryIds.has(item.categoryId)) {
      throw new Error(`${description} ("${item.label}") refers to an unknown category.`);
    }
    const start = typeof item.start === 'string' ? parseMonthKey(item.start) : null;
    if (start === null) {
      throw new Error(`${description} ("${item.label}") needs a "start" month like "2010-05".`);
    }
    if (item.end !== null) {
      const end = typeof item.end === 'string' ? parseMonthKey(item.end) : null;
      if (end === null || end < start) {
        throw new Error(`${description} ("${item.label}") needs an "end" month on or after its start, or null.`);
      }
    }
    if (item.notes !== undefined && typeof item.notes !== 'string') {
      throw new Error(`${description} ("${item.label}") has non-text "notes".`);
    }
    return {
      id: item.id,
      categoryId: item.categoryId,
      label: item.label,
      start: item.start as string,
      end: item.end as string | null,
      color: isColorKey(item.color) ? item.color : COLOR_KEYS[0],
      ...(item.notes ? { notes: item.notes } : {}),
    };
  });

  return { version: 1, birthday: json.birthday, categories, items };
}

export function loadTimeline(): TimelineData | null {
  try {
    const saved = localStorage.getItem(TIMELINE_STORAGE_KEY);
    return saved ? parseTimeline(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

export function saveTimeline(data: TimelineData): void {
  try {
    localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable (private browsing); export still works.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

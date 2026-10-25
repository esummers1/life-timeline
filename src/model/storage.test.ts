import { afterEach, describe, expect, it, vi } from 'vitest';
import { suggestColor } from './palette';
import { createDefaultTimeline, loadTimeline, parseTimeline } from './storage';
import example from '../../examples/sample-timeline.json';

const validTimeline = {
  version: 1,
  birthday: '1990-04-12',
  categories: [{ id: 'home', name: 'Home' }],
  items: [{ id: 'flat', categoryId: 'home', label: 'Flat', start: '2010-05', end: '2017-06', color: 'teal' }],
};

describe('parseTimeline', () => {
  it('accepts valid data and round-trips the default timeline', () => {
    expect(parseTimeline(validTimeline)).toEqual(validTimeline);
    const defaults = createDefaultTimeline();
    expect(parseTimeline(JSON.parse(JSON.stringify(defaults)))).toEqual(defaults);
  });

  it('starts new timelines with the default lanes', () => {
    expect(createDefaultTimeline().categories.map(({ name }) => name)).toEqual(['Home', 'Education', 'Work', 'Relationship']);
  });

  it('accepts the bundled example file', () => {
    expect(parseTimeline(example).items.length).toBeGreaterThan(0);
  });

  it('falls back to a palette colour for unknown colours', () => {
    const parsed = parseTimeline({ ...validTimeline, items: [{ ...validTimeline.items[0], color: 'chartreuse' }] });
    expect(parsed.items[0].color).toBe('blue');
  });

  it.each([
    ['a non-timeline', { hello: 'world' }, /version/],
    ['a bad birthday', { ...validTimeline, birthday: '1990-02-30' }, /birthday/],
    ['an unknown category', { ...validTimeline, items: [{ ...validTimeline.items[0], categoryId: 'work' }] }, /unknown category/],
    ['a malformed start', { ...validTimeline, items: [{ ...validTimeline.items[0], start: 'May 2010' }] }, /start/],
    ['an end before the start', { ...validTimeline, items: [{ ...validTimeline.items[0], end: '2009-01' }] }, /end/],
    ['duplicate category ids', { ...validTimeline, categories: [...validTimeline.categories, validTimeline.categories[0]] }, /categories share/],
    ['duplicate item ids', { ...validTimeline, items: [validTimeline.items[0], validTimeline.items[0]] }, /items share/],
  ])('rejects %s', (_description, json, message) => {
    expect(() => parseTimeline(json)).toThrow(message);
  });
});

describe('loadTimeline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function stubStorage(entries: Record<string, string>) {
    const storage = new Map(Object.entries(entries));
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
    return storage;
  }

  it('loads saved data', () => {
    stubStorage({ 'life-timeline:data': JSON.stringify(validTimeline) });
    expect(loadTimeline()).toEqual(validTimeline);
  });

  it('returns null when nothing is saved', () => {
    stubStorage({});
    expect(loadTimeline()).toBeNull();
  });

  it('keeps a copy of unreadable saved data rather than letting it be overwritten', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const storage = stubStorage({ 'life-timeline:data': '{"version": 2}' });
    expect(loadTimeline()).toBeNull();
    const backups = [...storage].filter(([key]) => key.startsWith('life-timeline:data:unreadable-'));
    expect(backups.map(([, value]) => value)).toEqual(['{"version": 2}']);
  });
});

describe('suggestColor', () => {
  it('prefers colours unused in the lane, then unused overall', () => {
    const items = parseTimeline(validTimeline).items;
    expect(suggestColor(items, 'home')).toBe('blue');
    expect(suggestColor([{ ...items[0], color: 'blue' }], 'home')).toBe('amber');
    expect(suggestColor([{ ...items[0], color: 'blue' }], 'work')).toBe('amber');
  });
});

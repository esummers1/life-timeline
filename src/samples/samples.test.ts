import { describe, expect, it } from 'vitest';
import { parseTimeline } from '../model/storage';
import { findUnmodifiedSample, SAMPLES } from '.';

describe('SAMPLES', () => {
  it.each(SAMPLES)('$name is a valid timeline with a birthday and items in every lane', ({ timeline }) => {
    expect(parseTimeline(JSON.parse(JSON.stringify(timeline)))).toEqual(timeline);
    expect(timeline.birthday).not.toBeNull();
    for (const category of timeline.categories) {
      expect(timeline.items.some((item) => item.categoryId === category.id)).toBe(true);
    }
  });

  it('uses ids that are unique across samples', () => {
    const ids = SAMPLES.flatMap(({ timeline }) => [...timeline.categories, ...timeline.items].map(({ id }) => id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('findUnmodifiedSample', () => {
  const [homer] = SAMPLES;

  it('recognises an untouched sample, including after a save and reload', () => {
    expect(findUnmodifiedSample(homer.timeline)).toBe(homer);
    expect(findUnmodifiedSample(parseTimeline(JSON.parse(JSON.stringify(homer.timeline))))).toBe(homer);
  });

  it('stops recognising a sample once it has been changed', () => {
    const renamed = { ...homer.timeline, items: homer.timeline.items.map((item, index) => (index === 0 ? { ...item, label: 'Moe’s' } : item)) };
    expect(findUnmodifiedSample(renamed)).toBeUndefined();
    expect(findUnmodifiedSample({ ...homer.timeline, birthday: null })).toBeUndefined();
  });
});

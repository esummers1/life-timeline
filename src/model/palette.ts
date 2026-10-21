import type { LifeItem } from './types';

/**
 * Item colours. Ordered so that consecutive suggestions contrast with each other.
 * Bars blend these with the theme surface colour, so the same base hues work in
 * both light and dark mode.
 */
export const PALETTE = {
  blue: '#3b82f6',
  amber: '#f59e0b',
  teal: '#14b8a6',
  pink: '#ec4899',
  green: '#22c55e',
  violet: '#8b5cf6',
  orange: '#f97316',
  indigo: '#6366f1',
  lime: '#84cc16',
  red: '#ef4444',
  slate: '#64748b',
} as const;

export type ColorKey = keyof typeof PALETTE;

export const COLOR_KEYS = Object.keys(PALETTE) as ColorKey[];

export function isColorKey(value: unknown): value is ColorKey {
  return typeof value === 'string' && value in PALETTE;
}

/**
 * Picks a colour for a new item in the given category: the colour least used within
 * that category, breaking ties by least used across the whole timeline, then by
 * palette order. This keeps neighbouring items in a lane visually distinct.
 */
export function suggestColor(items: LifeItem[], categoryId: string): ColorKey {
  const usageInCategory = new Map<ColorKey, number>();
  const usageOverall = new Map<ColorKey, number>();
  for (const item of items) {
    usageOverall.set(item.color, (usageOverall.get(item.color) ?? 0) + 1);
    if (item.categoryId === categoryId) {
      usageInCategory.set(item.color, (usageInCategory.get(item.color) ?? 0) + 1);
    }
  }
  return [...COLOR_KEYS].sort(
    (first, second) =>
      (usageInCategory.get(first) ?? 0) - (usageInCategory.get(second) ?? 0) ||
      (usageOverall.get(first) ?? 0) - (usageOverall.get(second) ?? 0),
  )[0];
}

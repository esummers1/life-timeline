import type { Category } from './types';

/**
 * Returns the categories with the given one moved `offset` places (negative is
 * up). Moves past either end are clamped; an unknown id leaves the order unchanged.
 */
export function moveCategory(categories: Category[], categoryId: string, offset: number): Category[] {
  const fromIndex = categories.findIndex((category) => category.id === categoryId);
  if (fromIndex === -1) return categories;
  const toIndex = Math.min(categories.length - 1, Math.max(0, fromIndex + offset));
  const reordered = [...categories];
  reordered.splice(toIndex, 0, ...reordered.splice(fromIndex, 1));
  return reordered;
}

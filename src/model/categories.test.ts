import { describe, expect, it } from 'vitest';
import { moveCategory } from './categories';

const categories = ['home', 'work', 'study', 'car'].map((id) => ({ id, name: id }));
const order = (moved: typeof categories) => moved.map(({ id }) => id);

describe('moveCategory', () => {
  it('moves a lane up or down', () => {
    expect(order(moveCategory(categories, 'study', -1))).toEqual(['home', 'study', 'work', 'car']);
    expect(order(moveCategory(categories, 'home', 2))).toEqual(['work', 'study', 'home', 'car']);
  });

  it('clamps moves past either end', () => {
    expect(order(moveCategory(categories, 'home', -1))).toEqual(['home', 'work', 'study', 'car']);
    expect(order(moveCategory(categories, 'study', 5))).toEqual(['home', 'work', 'car', 'study']);
  });

  it('leaves the order alone for an unknown lane, without mutating the input', () => {
    expect(moveCategory(categories, 'pets', 1)).toBe(categories);
    moveCategory(categories, 'home', 1);
    expect(order(categories)).toEqual(['home', 'work', 'study', 'car']);
  });
});

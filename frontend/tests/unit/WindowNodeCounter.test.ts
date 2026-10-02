import { describe, test, expect } from '@jest/globals';
import WindowNodeCounter from '../../../player/src/web/managers/WindowNodeCounter';

const add = (c: WindowNodeCounter, id: number, parentID: number) =>
  c.addNode({ id, parentID, time: 0 });

describe('WindowNodeCounter', () => {
  test('counts nodes added under the document root', () => {
    const c = new WindowNodeCounter();
    expect(add(c, 1, 0)).toBe(true);
    expect(add(c, 2, 1)).toBe(true);
    expect(add(c, 3, 1)).toBe(true);
    expect(c.count).toBe(3);
  });

  test('rejects unknown parents and duplicate ids', () => {
    const c = new WindowNodeCounter();
    add(c, 1, 0);
    expect(add(c, 5, 42)).toBe(false);
    expect(add(c, 1, 0)).toBe(false);
    expect(c.count).toBe(1);
  });

  test('removing a subtree root drops its descendants and frees their ids', () => {
    const c = new WindowNodeCounter();
    add(c, 1, 0);
    add(c, 2, 1);
    add(c, 3, 2);
    add(c, 4, 2);
    add(c, 5, 0);
    expect(c.count).toBe(5);

    expect(c.removeNode({ id: 2 })).toBe(true);
    expect(c.count).toBe(2);
    // descendants are gone: children of removed nodes can't be attached to
    expect(add(c, 10, 3)).toBe(false);
    expect(c.removeNode({ id: 4 })).toBe(false);
    // ids can be reused after removal
    expect(add(c, 2, 5)).toBe(true);
    expect(c.count).toBe(3);
  });

  test('the document root cannot be removed', () => {
    const c = new WindowNodeCounter();
    add(c, 1, 0);
    expect(c.removeNode({ id: 0 })).toBe(false);
    expect(add(c, 2, 0)).toBe(true);
    expect(c.count).toBe(2);
  });

  test('moving a subtree keeps the total and re-parents counts', () => {
    const c = new WindowNodeCounter();
    add(c, 1, 0);
    add(c, 2, 0);
    add(c, 3, 1);
    add(c, 4, 3);
    expect(c.moveNode({ id: 3, parentID: 2, time: 0 })).toBe(true);
    expect(c.count).toBe(4);
    // removing the old parent no longer takes the moved subtree with it
    c.removeNode({ id: 1 });
    expect(c.count).toBe(3);
    c.removeNode({ id: 2 });
    expect(c.count).toBe(0);
  });

  test('removed subtrees are forgotten, so their ids can be reused', () => {
    const c = new WindowNodeCounter();
    add(c, 1, 0);
    add(c, 2, 1);
    add(c, 3, 2);
    c.removeNode({ id: 2 });
    expect(c.count).toBe(1);
    expect(add(c, 3, 1)).toBe(true);
    expect(c.count).toBe(2);
  });

  test('reset starts from an empty document', () => {
    const c = new WindowNodeCounter();
    add(c, 1, 0);
    c.reset();
    expect(c.count).toBe(0);
    expect(add(c, 1, 0)).toBe(true);
  });
});

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import ListWalker from '../../app/player/common/ListWalker';
import type { Timed } from '../../app/player/common/types';

interface Item extends Timed {
  value?: string;
}

describe('ListWalker', () => {
  let walker: ListWalker<Item>;

  beforeEach(() => {
    walker = new ListWalker<Item>([]);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('append maintains order and prevents out of order inserts', () => {
    walker.append({ time: 1 });
    walker.append({ time: 3 });
    expect(walker.list.map((i) => i.time)).toEqual([1, 3]);

    walker.append({ time: 2 });
    expect(walker.list.map((i) => i.time)).toEqual([1, 3]);
    expect((console.error as jest.Mock).mock.calls.length).toBe(1);
  });

  test('unshift prepends items', () => {
    walker.append({ time: 2 });
    walker.unshift({ time: 1 });
    expect(walker.list.map((i) => i.time)).toEqual([1, 2]);
  });

  test('insert places item according to time', () => {
    walker.append({ time: 1 });
    walker.append({ time: 3 });
    walker.insert({ time: 2 });
    expect(walker.list.map((i) => i.time)).toEqual([1, 2, 3]);
  });

  test('moveGetLast advances pointer and returns item', () => {
    walker = new ListWalker<Item>([{ time: 1 }, { time: 3 }, { time: 5 }]);

    expect(walker.moveGetLast(3)?.time).toBe(3);
    expect(walker.countNow).toBe(2);

    expect(walker.moveGetLast(3)).toBeNull();
    expect(walker.moveGetLast(4)).toBeNull();
    expect(walker.moveGetLast(4, undefined, true)?.time).toBe(3);

    expect(walker.moveGetLast(1)?.time).toBe(1);
    expect(walker.countNow).toBe(1);
  });

  test('getNew returns items when pointer moves or time decreases', () => {
    walker = new ListWalker<Item>([{ time: 1 }, { time: 3 }, { time: 5 }]);

    expect(walker.getNew(2)?.time).toBe(1);
    expect(walker.getNew(4)?.time).toBe(3);
    expect(walker.getNew(4)).toBeNull();
    expect(walker.getNew(1)?.time).toBe(1);
  });

  test('findLast performs binary search', () => {
    walker = new ListWalker<Item>([{ time: 1 }, { time: 3 }, { time: 5 }]);

    expect(walker.findLast(4)?.time).toBe(3);
    expect(walker.findLast(5)?.time).toBe(5);
    expect(walker.findLast(0)).toBeNull();
  });

  test('moveApply iterates over items up to time', () => {
    walker = new ListWalker<Item>([{ time: 1 }, { time: 2 }, { time: 3 }]);
    const collected: number[] = [];

    walker.moveApply(2.5, (m) => collected.push(m.time));
    expect(collected).toEqual([1, 2]);
    expect(walker.countNow).toBe(2);

    walker.moveApply(1.5, (m) => collected.push(m.time));
    expect(collected).toEqual([1, 2, 1]);
    expect(walker.countNow).toBe(1);
  });
});

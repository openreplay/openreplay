import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import ListWalker from '../../../player/src/common/ListWalker';
import ListWalkerWithMarks from '../../../player/src/common/ListWalkerWithMarks';
import type { Timed } from '../../../player/src/common/types';

interface Item extends Timed {
  value?: string;
}

describe('ListWalker', () => {
  let walker: ListWalker<Item>;

  beforeEach(() => {
    walker = new ListWalker<Item>([]);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('append maintains order and inserts out of order items by time', () => {
    walker.append({ time: 1 });
    walker.append({ time: 3 });
    expect(walker.list.map((i) => i.time)).toEqual([1, 3]);

    walker.append({ time: 2 });
    expect(walker.list.map((i) => i.time)).toEqual([1, 2, 3]);
    expect((console.error as jest.Mock).mock.calls.length).toBe(0);
  });

  test('append puts an older item after the items with the same time', () => {
    walker.append({ time: 1 });
    walker.append({ time: 3, value: 'a' });
    walker.append({ time: 5 });
    walker.append({ time: 3, value: 'b' });
    walker.append({ time: 0 });

    expect(walker.list.map((i) => `${i.time}${i.value ?? ''}`)).toEqual([
      '0',
      '1',
      '3a',
      '3b',
      '5',
    ]);
  });

  test('append behind the pointer keeps the current item', () => {
    walker = new ListWalker<Item>([{ time: 1 }, { time: 3 }, { time: 5 }]);
    walker.moveGetLast(3);
    expect(walker.current?.time).toBe(3);

    walker.append({ time: 2 });
    expect(walker.current?.time).toBe(3);
    expect(walker.countNow).toBe(3);

    walker.append({ time: 4 });
    expect(walker.countNow).toBe(3);
    expect(walker.moveGetLast(4)?.time).toBe(4);
  });

  // dom.mobs can hold an assets batch that ends after dom.mobe starts.
  test('a second file starting before the first one ends loses nothing', () => {
    const first = [{ time: 0 }, { time: 10 }, { time: 15 }, { time: 29 }];
    const second = [{ time: 16 }, { time: 20 }, { time: 30 }];
    [...first, ...second].forEach((m) => walker.append(m));

    expect(walker.list.map((i) => i.time)).toEqual([0, 10, 15, 16, 20, 29, 30]);
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

describe('ListWalkerWithMarks', () => {
  test('an item appended behind the pointer counts as passed', () => {
    const walker = new ListWalkerWithMarks<Item>(
      (i) => i.value === 'mark',
      [{ time: 1 }, { time: 3 }, { time: 5 }],
    );
    walker.moveGetLast(3);

    walker.append({ time: 2, value: 'mark' });
    walker.append({ time: 4, value: 'mark' });
    expect(walker.markedCount).toBe(2);
    expect(walker.markedCountNow).toBe(1);

    walker.moveGetLast(5);
    expect(walker.markedCountNow).toBe(2);
  });
});

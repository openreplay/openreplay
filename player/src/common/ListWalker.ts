import type { Timed } from '../common/types';

export default class ListWalker<T extends Timed> {
  /* Pointer to the "current" item */
  private p = 0;

  private warnedOutOfOrder = false;

  constructor(private _list: Array<T> = []) {}

  /**
   * Appends in time order. Out-of-order items (late batches, cross-file splits)
   * are inserted at their sorted position instead of being dropped.
   */
  append(m: T): void {
    const last = this.last;
    if (last && m.time < last.time) {
      if (!this.warnedOutOfOrder) {
        this.warnedOutOfOrder = true;
        console.warn(
          'ListWalker: out-of-order item inserted by time',
          m.time,
          'vs tail',
          last.time,
        );
      }
      this.insert(m);
      return;
    }
    this.list.push(m);
    this.onAdd(m);
  }

  unshift(m: T): void {
    this.list.unshift(m);
    this.onAdd(m);
    if (this.p > 0) {
      this.p++;
      this.onPassedInsert(m);
    }
  }

  /** Sorted insert (after items with equal time). O(log n) search, O(1) for in-order items. */
  insert(m: T): void {
    const list = this.list;
    this.onAdd(m);
    if (list.length === 0 || list[list.length - 1].time <= m.time) {
      list.push(m);
      return;
    }
    let lo = 0;
    let hi = list.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid].time <= m.time) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    list.splice(lo, 0, m);
    if (lo < this.p) {
      // keep the pointer on the same "current" item; the new one counts as passed
      this.p++;
      this.onPassedInsert(m);
    }
  }

  /** Removes the item at `index`, keeping the pointer on the same current item. */
  removeAt(index: number): T | undefined {
    if (index < 0 || index >= this.list.length) {
      return undefined;
    }
    const [removed] = this.list.splice(index, 1);
    this.onRemove(removed);
    if (index < this.p) {
      this.p--;
      this.onPassedRemove(removed);
    }
    return removed;
  }

  /** Hooks for subclasses tracking per-item state. */
  protected onAdd(_m: T): void {}

  protected onRemove(_m: T): void {}

  protected onPassedInsert(_m: T): void {}

  protected onPassedRemove(_m: T): void {}

  reset(): void {
    this.p = 0;
  }

  sort(comparator: (a: T, b: T) => number): void {
    // @ts-ignore
    this.list.sort((m1, m2) => comparator(m1, m2) || m1._index - m2._index); // indexes for sort stability (TODO: fix types???)
  }

  forEach(f: (item: T) => void): void {
    this.list.forEach(f);
  }

  get last(): T | null {
    const { list } = this;
    return list.length === 0 ? null : list[list.length - 1];
  }

  get current(): T | null {
    if (this.p === 0) {
      return null;
    }
    return this.list[this.p - 1];
  }

  get timeNow(): number {
    if (this.p === 0) {
      return 0;
    }
    return this.list[this.p - 1].time;
  }

  get length(): number {
    return this.list.length;
  }

  get maxTime(): number {
    if (this.length === 0) {
      return 0;
    }
    return this.list[this.length - 1].time;
  }

  get minTime(): number {
    if (this.length === 0) {
      return 0;
    }
    return this.list[0].time;
  }

  get listNow(): Array<T> {
    return this.list.slice(0, this.p);
  }

  get list(): Array<T> {
    return this._list;
  }

  get count(): number {
    return this.length;
  }

  get countNow(): number {
    return this.p;
  }

  private hasNext() {
    return this.p < this.length;
  }

  private hasPrev() {
    return this.p > 0;
  }

  protected moveNext(): T | null {
    return this.hasNext() ? this.list[this.p++] : null;
  }

  protected movePrev(): T | null {
    return this.hasPrev() ? this.list[--this.p] : null;
  }

  /**
   * @returns last message with the time <= t.
   * Assumed that the current message is already handled so
   * if pointer doesn't change <null> is returned.
   */
  moveGetLast(
    t: number,
    index?: number,
    force?: boolean,
    debug?: boolean,
  ): T | null {
    const key: string = index ? '_index' : 'time';
    const val = index ? index : t;

    let changed = false;
    // @ts-ignore
    while (this.p < this.length && this.list[this.p][key] <= val) {
      this.moveNext();
      changed = true;
    }
    // @ts-ignore
    while (this.p > 0 && this.list[this.p - 1][key] > val) {
      this.movePrev();
      changed = true;
    }
    if (debug) {
      console.log(this.list[this.p - 1]);
    }
    return changed || force ? this.list[this.p - 1] : null;
  }

  prevTs = 0;

  getNew(t: number, index?: number): T | null {
    const key: string = 'time'; // TODO
    const val = t;

    let changed = this.prevTs > t;
    this.prevTs = t;
    // @ts-ignore
    while (this.p < this.length && this.list[this.p][key] <= val) {
      this.moveNext();
      changed = true;
    }
    // @ts-ignore
    while (this.p > 0 && this.list[this.p - 1][key] > val) {
      this.movePrev();
      changed = true;
    }
    return changed ? this.list[this.p - 1] : null;
  }

  findLast(t: number): T | null {
    let left = 0;
    let right = this.list.length - 1;
    let result: T | null = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const currentItem = this.list[mid];

      if (currentItem.time <= t) {
        result = currentItem;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  }

  /**
   * Moves over the messages starting from the current+1 to the last one with the time <= t
   * applying callback on each of them
   * @param t - max message time to move to; will move & apply callback while msg.time <= t
   * @param callback - a callback to apply on each message passing by while moving
   */
  moveApply(t: number, callback: (msg: T) => void): void {
    // Applying only in increment order for now
    if (t < this.timeNow) {
      this.reset();
    }

    const { list } = this;
    while (list[this.p] && list[this.p].time <= t) {
      callback(this.list[this.p++]);
    }
  }
}

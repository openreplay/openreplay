import type { Timed } from './types';
import ListWalker from './ListWalker';

type CheckFn<T> = (t: T) => boolean;

export default class ListWalkerWithMarks<
  T extends Timed,
> extends ListWalker<T> {
  private _markCountNow: number = 0;

  private _markCount: number = 0;

  constructor(
    private isMarked: CheckFn<T>,
    initialList: T[] = [],
  ) {
    super(initialList);
    this._markCount = initialList.reduce(
      (n, item) => (isMarked(item) ? n + 1 : n),
      0,
    );
  }

  append(item: T) {
    const marked = this.isMarked(item);
    if (marked) {
      this._markCount++;
    }
    const countNow = this.countNow;
    super.append(item);
    // Inserted behind the pointer: the pointer moved past it.
    if (marked && this.countNow > countNow) {
      this._markCountNow++;
    }
  }

  protected moveNext() {
    const val = super.moveNext();
    if (val && this.isMarked(val)) {
      this._markCountNow++;
    }
    return val;
  }

  protected movePrev() {
    const val = super.movePrev();
    if (val && this.isMarked(val)) {
      this._markCountNow--;
    }
    return val;
  }

  get markedCountNow(): number {
    return this._markCountNow;
  }

  get markedCount(): number {
    return this._markCount;
  }
}

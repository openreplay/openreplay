import type { Timed } from 'Player';

export default class ListWalker<T extends Timed> {
	/* Pointer to the "current" item */
	private p = 0
	constructor(private _list: Array<T> = []) {}

	append(m: T): void {
		if (this.length > 0 && this.last && m.time < this.last.time) {
			console.error("Trying to append message with the less time then the list tail:", m.time, 'vs', this.last.time, m, this)
			return
		}
		this.list.push(m);
	}

	unshift(m: T): void {
		this.list.unshift(m)
	}

	insert(m: T): void {
		let index = this.list.findIndex(om => om.time > m.time)
		if (index === -1) {
			index = this.length
		}
		const oldList = this.list
		this._list = [...oldList.slice(0, index), m, ...oldList.slice(index)]
	}

	reset(): void {
		this.p = 0
	}

	sort(comparator: (a: T, b: T) => number): void {
		// @ts-ignore
		this.list.sort((m1,m2) => comparator(m1,m2) || (m1._index - m2._index) ); // indexes for sort stability (TODO: fix types???)
	}

	forEach(f: (item: T) => void):void {
		this.list.forEach(f);
	}

	get last(): T | null {
		if (this.list.length === 0) {
			return null;
		}
		return this.list.slice(-1)[0];
	}

	get current(): T | null {
		if (this.p === 0) {
			return null;
		}
		return this.list[ this.p - 1 ];
	}

	get timeNow(): number {
		if (this.p === 0) {
			return 0;
		}
		return this.list[ this.p - 1 ].time;
	}

	get length(): number {
		return this.list.length;
	}

	get maxTime(): number {
		if (this.length === 0) {
			return 0;
		}
		return this.list[ this.length - 1 ].time;
	}
	get minTime(): number {
		if (this.length === 0) {
			return 0;
		}
		return this.list[ 0 ].time;
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
		return this.p < this.length
	}
	private hasPrev() {
		return this.p > 0
	}
	protected moveNext(): T | null {
		return this.hasNext()
			? this.list[ this.p++ ]
			: null
	}
	protected movePrev(): T | null {
		return this.hasPrev()
			? this.list[ --this.p ]
			: null
	}

	/**
	 * @returns last message with the time <= t.
	 * Assumed that the current message is already handled so
	 * if pointer doesn't change <null> is returned.
	 */
	moveGetLast(t: number, index?: number): T | null {
		let key: string = "time"; //TODO
		let val = t;
		if (index) {
			key = "_index";
			val = index;
		}

		let changed = false;
		// @ts-ignore
		while (this.p < this.length && this.list[this.p][key] <= val) {
			this.moveNext()
			changed = true;
		}
		// @ts-ignore
		while (this.p > 0 && this.list[ this.p - 1 ][key] > val) {
			this.movePrev()
			changed = true;
		}
		return changed ? this.list[ this.p - 1 ] : null;
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

		const list = this.list
		while (list[this.p] && list[this.p].time <= t) {
			callback(this.list[ this.p++ ])
		}
	}

}

import type { Timed } from '../messages/timed';

export default class ListWalker<T extends Timed> {
	private p = 0
	constructor(private _list: Array<T> = []) {}

	append(m: T): void {
		if (this.length > 0 && this.last && m.time < this.last.time) {
			console.error("Trying to append message with the less time then the list tail: ", m)
			return
		}
		this.list.push(m);
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
		return this.list[ this.list.length - 1 ];
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

	/*
		Returns last message with the time <= t.
		Assumed that the current message is already handled so 
		if pointer doesn't cahnge <null> is returned.
	*/
	moveGetLast(t: number, index?: number): T | null {
		let key: string = "time"; //TODO
		let val = t;
		if (index) {
			key = "_index";
			val = index;
		}

		let changed = false;
		while (this.p < this.length && this.list[this.p][key] <= val) {
			this.p++;
			changed = true;
		}
		while (this.p > 0 && this.list[ this.p - 1 ][key] > val) {
			this.p--;
			changed = true;
		}
		return changed ? this.list[ this.p - 1 ] : null;
	}

	moveApply(t: number, fn: (msg: T) => void, fnBack?: (msg: T) => void): void {
		// Applying only in increment order for now
		if (t < this.timeNow) {
			this.reset();
		}

		const list = this.list
		while (list[this.p] && list[this.p].time <= t) {
			fn(list[ this.p++ ]);
		}
		while (fnBack && this.p > 0 && list[ this.p - 1 ].time > t) {
			fnBack(list[ --this.p ]);
		}
	}

	async moveWait(t: number, fn: (msg: T) => Promise<any> | undefined): Promise<void> {
		// Applying only in increment order for now
		if (t < this.timeNow) {
			this.reset();
		}

		const list = this.list
		while (list[this.p] && list[this.p].time <= t) {
			const ret = fn(this.list[ this.p++ ]);
			if (ret) { await ret }
		}
	}

}

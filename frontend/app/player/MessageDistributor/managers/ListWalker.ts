import type { Timed } from '../messages/timed';

export default class ListWalker<T extends Timed> {
	// Optimisation: #prop compiles to method that costs mor than strict property call.
	_p = 0;
	_list: Array<T>;
	constructor(list: Array<T> = []) {
		this._list = list;
	}

	add(m: T): void {
		return this.append(m);
	}

	append(m: T): void {
		if (this.length > 0 && this.last && m.time < this.last.time) {
			console.error("Trying to append message with the less time then the list tail: ", m);
		}
		this._list.push(m);
	}

	reset(): void {
		this._p = 0;
	}

	sort(comparator): void {
		// @ts-ignore
		this._list.sort((m1,m2) => comparator(m1,m2) || (m1._index - m2._index) ); // indexes for sort stability (TODO: fix types???)
	}

	forEach(f):void {
		this._list.forEach(f);
	}

	// set pointer(p: number): void {
	// 	if (p >= this.length || p < 0) {
	// 		// console.error("Trying to set wrong pointer")
	// 		return;
	// 	}
	// 	this._p = p;
	// }

	get last(): T | null {
		if (this._list.length === 0) {
			return null;
		}
		return this._list[ this._list.length - 1 ];
	}

	get current(): T | null {
		if (this._p === 0) {
			return null;
		}
		return this._list[ this._p - 1 ];
	}

	get timeNow(): number {
		if (this._p === 0) {
			return 0;
		}
		return this._list[ this._p - 1 ].time;
	}

	get length(): number {
		return this._list.length;
	}

	get maxTime(): number {
		if (this.length === 0) {
			return 0;
		}
		return this._list[ this.length - 1 ].time;
	}
	get minTime(): number {
		if (this.length === 0) {
			return 0;
		}
		return this._list[ 0 ].time;
	}

	get listNow(): Array<T> {
		return this._list.slice(0, this._p);
	}

	get list(): Array<T> {
		return this._list;
	}

	get count(): number {
		return this.length;
	}

	get countNow(): number {
		return this._p;
	}

	/*
		Returns last message with the time <= t.
		Assumed that the current message is already handled so 
		if pointer doesn't cahnge <undefined> is returned.
	*/
	moveToLast(t: number, index?: number): T | null {
		let key: string = "time"; //TODO
		let val = t;
		if (index) {
			key = "_index";
			val = index;
		}

		let changed = false;
		while (this._p < this.length && this._list[this._p][key] <= val) {
			this._p++;
			changed = true;
		}
		while (this._p > 0 && this._list[ this._p - 1 ][key] > val) {
			this._p--;
			changed = true;
		}
		return changed ? this._list[ this._p - 1 ] : null;
	}

	// moveToLastByIndex(i: number): ?T {
	// 	let changed = false;
	// 	while (!!this._list[this._p] && this._list[this._p]._index <= i) {
	// 		this._p++;
	// 		changed = true;
	// 	}
	// 	while (this._p > 0 && this._list[ this._p - 1 ]._index > i) {
	// 		this._p--;
	// 		changed = true;
	// 	}
	// 	return changed ? this._list[ this._p - 1 ] : undefined;
	// }

	moveApply(t: number, fn: (T) => void): void {
		// Applying only in increment order for now
		if (t < this.timeNow) {
			this.reset();
		}

		while (!!this._list[this._p] && this._list[this._p].time <= t) {
			fn(this._list[ this._p++ ]);
		}
		//while (this._p > 0 && this._list[ this._p - 1 ].time > t) {
		//	fnBack(this._list[ --this._p ]);
		//}
	}

}
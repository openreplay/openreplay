export default class ListReader {
	_callback;
	_p = -1;
	_list = [];
	_offset = 0;

	constructor(callback = Function.prototype) {
		if (typeof callback !== 'function') {
			return console.error("List Reader: wrong constructor argument. `callback` must be a function.");
		}
		this._callback = callback;
	}

	static checkItem(item) {
		if(typeof item !== 'object' || item === null) {
			console.error("List Reader: expected item to be not null object but got ", item);
			return false;
		}
		if (typeof item.time !== 'number') {
			console.error("List Reader: expected item to have number property 'time', ", item);
			return false;
		}
		// if (typeof item.index !== 'number') {
		// 	console.error("List Reader: expected item to have number property 'index', ", item);
		// 	return false;
		// }   // future: All will have index
		return true;
	}
	/* EXTENDABLE METHODS */
	_onIncrement() {}
	_onDecrement() {}
	_onStartTimeChange() {}

	inc() {
		const item = this._list[ ++this._p ];
		this._onIncrement(item);
		return item;
	}

	dec() {
		const item = this._list[ this._p-- ];
		this._onDecrement(item);
		return item
	}

	get _goToReturn() {
		return { listNow: this.listNow };
	}

	goTo(time) {
		const prevPointer = this._p;
		while (!!this._list[ this._p + 1 ] && this._list[ this._p + 1 ].time <= time) {
			this.inc();
		}
		while (this._p >= 0 && this._list[ this._p ].time > time) {
			this.dec();
		}
		if (prevPointer !== this._p) {
			//this._notify([ "listNow" ]);
			return this._goToReturn;
		}
	}

	goToIndex(index) {  // thinkaboutit
		const prevPointer = this._p;
		while (!!this._list[ this._p + 1 ] && 
			this._list[ this._p + 1 ].index <= index
		) {
			this.inc();
		}
		while (this._p >= 0 && this._list[ this._p ].index > index) {
			this.dec();
		}
		if (prevPointer !== this._p) {
			//this._notify([ "listNow" ]);
			return this._goToReturn;
		}
	}

	// happens rare MBTODO only in class ResourceListReader extends ListReaderWithRed
	set startTime(time) {
		const prevOffset = this._offset;
		const prevPointer = this._p;
		this._offset = this._list.findIndex(({ time, duration = 0 }) => time + duration >= time); // TODO: strict for duration rrrrr
		this._p = Math.max(this._p, this._offset - 1);
		if (prevOffset !== this._offset || prevPointer !== this._p) {
			this._notify([ "listNow" ]);
		}
		this._onStartTimeChange();
	}

	get list() {
		return this._list;
	}
	get count() {
		return this._list.length;
	}	
	get listNow() {
		return this._list.slice(this._offset, this._p + 1);
	}

	set list(_list) {
		if (!Array.isArray(_list)) {
			console.error("List Reader: wrong list value.", _list)
		}
		const valid = _list.every(this.constructor.checkItem);
		if (!valid) return;
		this._list = _list;  // future: time + index sort
		this._notify([ "list", "count" ]);
	}

	append(item) {
		if (!this.constructor.checkItem(item)) return;
		this._list.push(item); // future: time + index sort
		this._notify([ "count" ]); // list is the same by ref, CAREFULL
	}

	_notify(propertyList) {
		const changedState = {};
		propertyList.forEach(p => changedState[ p ] = this[ p ]);
		this._callback(changedState);
	}

}
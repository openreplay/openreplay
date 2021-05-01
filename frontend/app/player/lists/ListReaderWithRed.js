import ListReader from './ListReader';

export default class ListReaderWithRed extends ListReader {
	_redCountNow = 0;

	static checkItem(item) {
		const superCheckResult = super.checkItem(item);
		if (typeof item.isRed !== 'function') {
			console.error("List Reader With Red: expected item to have method 'isRed', ", item);
			return false;
		}
		return superCheckResult;
	}

	get _goToReturn() {
		return {
			listNow: this.listNow,
			redCountNow: this.redCountNow,
		}
	}

	_onIncrement(item) {
		if (item.isRed()) {
			this._redCountNow++;
			//this._notify([ "redCountNow" ]);
		}
	}

	_onDecrement(item) {
		if (item.isRed()) {
			this._redCountNow--;		
			//this._notify([ "redCountNow" ]);
		}
	}

	_onStartTimeChange() {
		this._redCountNow = this._list
			.slice(this._offset, this._p + 1)
			.filter(item => item.isRed())
			.length;
		this._notify([ "redCountNow" ]);
	}

	get redCountNow() {
		return this._redCountNow;
	}

}
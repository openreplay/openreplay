import readMessage from '../MessageDistributor/messages';


export default class Parser  {
	_p = 0
	_data
	_error = null
	constructor(byteArray) {
		this._data = byteArray;
	}

	parseEach(cb) {
		while (this.hasNext()) {
			const msg = this.parseNext();
			if (msg !== null) {
				cb(msg);
			}
		}
	}

	hasNext() {
		return !this._error && this._data.length > this._p;
	}

	parseNext() {
		let msg;
		[ msg, this._p ] = readMessage(this._data, this._p);
		return msg
	}

}
import readMessage from '../MessageDistributor/messages';
import PrimitiveReader from '../MessageDistributor/PrimitiveReader';


export default class Parser {
	private reader: PrimitiveReader
	private error = null
	constructor(byteArray) {
		this.reader = new PrimitiveReader(byteArray)
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
		return !this.error && this.reader.hasNext();
	}

	parseNext() {
		return readMessage(this.reader);
	}

}
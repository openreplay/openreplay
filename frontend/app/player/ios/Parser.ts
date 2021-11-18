import readMessage from '../MessageDistributor/messages';
import PrimitiveReader from '../MessageDistributor/PrimitiveReader';


export default class Parser {
	private reader: PrimitiveReader
	private error: boolean = false
	constructor(byteArray) {
		this.reader = new PrimitiveReader(byteArray)
	}

	parseEach(cb) {
		while (this.hasNext()) {
			const msg = this.next();
			if (msg !== null) {
				cb(msg);
			}
		}
	}

	hasNext() {
		return !this.error && this.reader.hasNext();
	}

	next() {
		try {
			return readMessage(this.reader)
		} catch(e) {
			console.warn(e)
			this.error = true
			return null
		}
	}

}
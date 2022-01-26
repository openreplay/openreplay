import RawMessageReader from '../MessageDistributor/messages/RawMessageReader';


export default class Parser {
	private reader: RawMessageReader
	private error: boolean = false
	constructor(byteArray) {
		this.reader = new RawMessageReader(byteArray)
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
		return !this.error && this.reader.hasNextByte();
	}

	next() {
		try {
			return this.reader.readMessage()
		} catch(e) {
			console.warn(e)
			this.error = true
			return null
		}
	}

}
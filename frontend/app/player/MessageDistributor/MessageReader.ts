import type { TimedMessage, Indexed } from './Timed';

import logger from 'App/logger';
import readMessage, { Message } from './messages';
import PrimitiveReader from './PrimitiveReader';

// function needSkipMessage(data: Uint8Array, p: number, pLast: number): boolean {
//   for (let i = 7; i >= 0; i--) {
//     if (data[ p + i ] !== data[ pLast + i ]) {
//       return data[ p + i ] - data[ pLast + i ] < 0
//     }
//   }
//   return true
// }

export default class MessageReader extends PrimitiveReader {
	private pLastMessageID: number = 0;
	private currentTime: number = 0;
	public error: boolean = false;
	constructor(data: Uint8Array, private readonly startTime: number) {
		super(data);
	}

	private needSkipMessage(): boolean {
		if (this.p === 0) return false;
		for (let i = 7; i >= 0; i--) {
	    if (this.buf[ this.p + i ] !== this.buf[ this.pLastMessageID + i ]) {
	      return this.buf[ this.p + i ] - this.buf[ this.pLastMessageID + i ] < 0;
	    }
	  }
	  return true;
	}

	private readMessage(): Message | null {
		this.skip(8);
		try {
			let msg
			msg = readMessage(this);
			return msg;
		} catch (e) {
			this.error = true;
			logger.error("Read message error:", e);
			return null;
		}
	}

	hasNext():boolean {
		return !this.error && this.buf.length > this.p;
	}

	next(): [ TimedMessage, number] | null {
		if (!this.hasNext()) {
			return null;
		}

		while (this.needSkipMessage()) {
			this.readMessage();
		}
		this.pLastMessageID = this.p;

		const msg = this.readMessage();
		if (!msg) {
			return null;
		}

		if (msg.tp === "timestamp") {
			// if (this.startTime == null) {
			// 	this.startTime = msg.timestamp
			// }
			this.currentTime = msg.timestamp - this.startTime;
		} else {
			const tMsg = Object.assign(msg, {
				time: this.currentTime,
				_index: this.pLastMessageID,
			})
			return [tMsg, this.pLastMessageID];
		}
		return null;
	}
}
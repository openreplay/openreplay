import type { TimedMessage } from './Timed';

import logger from 'App/logger';
import readMessage from './messages';

function needSkipMessage(data: Uint8Array, p: number, pLast: number): boolean {
  for (let i = 7; i >= 0; i--) {
    if (data[ p + i ] !== data[ pLast + i ]) {
      return data[ p + i ] - data[ pLast + i ] < 0
    }
  }
  return true
}

export default class MessageGenerator {
	#data: Uint8Array;
	#p: number = 0;
	#pLastMessageID: number = 0;
	#startTime: number;
	#currentTime: ?number;

	#error: boolean = false;
	constructor(data: Uint8Array, startTime: number) {
		this.#startTime = startTime;
		this.#data = data;
	}

	_needSkipMessage():boolean {
		if (this.#p === 0) return false;
		for (let i = 7; i >= 0; i--) {
	    if (this.#data[ this.#p + i ] !== this.#data[ this.#pLastMessageID + i ]) {
	      return this.#data[ this.#p + i ] - this.#data[ this.#pLastMessageID + i ] < 0;
	    }
	  }
	  return true;
	}

	_readMessage(): ?Message {
		this.#p += 8;
		try {
			let msg
			[ msg, this.#p ] = readMessage(this.#data, this.#p);
			return msg;
		} catch (e) {
			this.#error = true;
			logger.error("Read message error:", e);
			return null;
		}
	}

	hasNext():boolean {
		return !this.#error && this.#data.length > this.#p;
	}

	next(): ?[ TimedMessage, number] {
		if (!this.hasNext()) {
			return null;
		}

		while (this._needSkipMessage()) {
			this._readMessage();
		}
		this.#pLastMessageID = this.#p;

		const msg = this._readMessage();
		if (!msg) {
			return null;
		}


		if (msg.tp === "timestamp") {
			// if (this.#startTime == null) {
			// 	this.#startTime = msg.timestamp
			// }
			this.#currentTime = msg.timestamp - this.#startTime;
		} else {
			msg.time = this.#currentTime;
			msg._index = this.#pLastMessageID;
			return [msg, this.#pLastMessageID];
		}
	}
}
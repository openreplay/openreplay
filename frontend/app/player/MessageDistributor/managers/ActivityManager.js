import ListWalker from './ListWalker';


class SkipInterval {
  constructor({ start = 0, end = 0 }) {
    this.start = start;
    this.end = end;
  }
  get time(): number {
  	return this.start;
  }
  contains(ts) {
    return ts > this.start && ts < this.end;
  }
}


export default class ActivityManager extends ListWalker<SkipInterval> {
	#endTime: number = 0;
	#minInterval: number = 0;
	#lastActivity: number = 0;
	constructor(duration: number) {
		super();
		this.#endTime = duration;
		this.#minInterval = duration *  0.1;
	}

	updateAcctivity(time: number) {
		if (time - this.#lastActivity >= this.#minInterval) {
			this.add(new SkipInterval({ start: this.#lastActivity,  end: time }));
		}
		this.#lastActivity = time;
	}

	end() {
		if (this.#endTime - this.#lastActivity >= this.#minInterval) {
			this.add(new SkipInterval({ start: this.#lastActivity, end: this.#endTime }));
		}

	}


}
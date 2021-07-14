import ListWalker from './ListWalker';


class SkipIntervalCls {
  constructor(private readonly start = 0, private readonly end = 0) {}
  
  get time(): number {
  	return this.start;
  }
  contains(ts) {
    return ts > this.start && ts < this.end;
  }
}

export type SkipInterval = InstanceType<typeof SkipIntervalCls>;


export default class ActivityManager extends ListWalker<SkipInterval> {
	private endTime: number = 0;
	private minInterval: number = 0;
	private lastActivity: number = 0;
	constructor(duration: number) {
		super();
		this.endTime = duration;
		this.minInterval = duration *  0.1;
	}

	updateAcctivity(time: number) {
		if (time - this.lastActivity >= this.minInterval) {
			this.add(new SkipIntervalCls(this.lastActivity, time));
		}
		this.lastActivity = time;
	}

	end() {
		if (this.endTime - this.lastActivity >= this.minInterval) {
			this.add(new SkipIntervalCls(this.lastActivity, this.endTime));
		}

	}

}
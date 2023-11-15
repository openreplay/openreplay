import ListWalker from '../../common/ListWalker';


class SkipIntervalCls {
  constructor(readonly start = 0, readonly end = 0) {}
  
  get time(): number {
  	return this.start;
  }
  contains(ts: number) {
    return ts > this.start && ts < this.end;
  }
}

export type SkipInterval = InstanceType<typeof SkipIntervalCls>;

export default class ActivityManager extends ListWalker<SkipInterval> {
	private readonly endTime: number = 0;
	private readonly minInterval: number = 0;
	private lastActivity: number = 0;
	constructor(duration: number) {
		super();
		this.endTime = duration;
		this.minInterval = duration *  0.1;
	}

	updateAcctivity(time: number) {
		if (time - this.lastActivity >= this.minInterval) {
			this.append(new SkipIntervalCls(this.lastActivity, time));
		}
		this.lastActivity = time;
	}

	end() {
		if (this.endTime - this.lastActivity >= this.minInterval) {
			this.append(new SkipIntervalCls(this.lastActivity, this.endTime));
		}

	}

}
// @flow

import type { PerformanceTrack, SetPageVisibility } from '../messages';
import type { Timed } from '../Timed';

import ListWalker from './ListWalker';

type TimedPerformanceTrack = Timed & PerformanceTrack;
type TimedSetPageVisibility = Timed & SetPageVisibility;

type PerformanceChartPoint = {
	time: number,
	usedHeap: number,
	totalHeap: number,
	fps: ?number,
	cpu: ?number,
	nodesCount: number,
}

export default class PerformanceTrackManager extends ListWalker<TimedPerformanceTrack> {
	#chart: Array<PerformanceChartPoint> = [];
	#isHidden: boolean = false;
	#timeCorrection: number = 0;
	#heapAvaliable: boolean = false;
	#fpsAvaliable: boolean = false;
	#cpuAvaliable: boolean = false;
	#prevTime: ?number = null;
	#prevNodesCount: number = 0;


	add(msg: TimedPerformanceTrack):void {
		let fps = null;
		let cpu = null;
		if (!this.#isHidden && this.#prevTime != null) {
			let timePassed = msg.time - this.#prevTime + this.#timeCorrection;

			if (timePassed > 0 && msg.frames >= 0) {
				if (msg.frames > 0) { this.#fpsAvaliable = true; }
				fps = msg.frames*1e3/timePassed; // Multiply by 1e3 as time in ms;
				fps = Math.min(fps,60); // What if 120?  TODO: alert if more than 60
				if (this.#chart.length === 1) {
					this.#chart[0].fps = fps;
				}
			}

			if (timePassed > 0 && msg.ticks >= 0) {
				this.#cpuAvaliable = true;
				let tickRate = msg.ticks * 30 / timePassed;
				if (tickRate > 1) {
					tickRate = 1;
				}
				cpu = Math.round(100 - tickRate*100);
				if (this.#chart.length === 1) {
					this.#chart[0].cpu = cpu;
				}
			}
		}

		this.#prevTime = msg.time;
		this.#timeCorrection = 0

		this.#heapAvaliable = this.#heapAvaliable || msg.usedJSHeapSize > 0;
		this.#chart.push({
			usedHeap: msg.usedJSHeapSize,
			totalHeap: msg.totalJSHeapSize,
			fps,
			cpu,
			time: msg.time,
			nodesCount: this.#prevNodesCount,
		});
		super.add(msg);
	}

	setCurrentNodesCount(count: number) {
		this.#prevNodesCount = count;
		if (this.#chart.length > 0) {
			this.#chart[ this.#chart.length - 1 ].nodesCount = count;
		}
	} 

	handleVisibility(msg: TimedSetPageVisibility):void {
		if (!this.#isHidden && msg.hidden && this.#prevTime != null) {
			this.#timeCorrection = msg.time - this.#prevTime;
		}
		if (this.#isHidden && !msg.hidden) {
			this.#prevTime = msg.time;
		}
		this.#isHidden = msg.hidden;
	}

	get chartData(): Array<PerformanceChartPoint> {
		return this.#chart;
	}

	get avaliability(): { cpu: boolean, fps: boolean, heap: boolean } {
		return {
			cpu: this.#cpuAvaliable,
			fps: this.#fpsAvaliable,
			heap: this.#heapAvaliable,
			nodes: true,
		}
	}

}
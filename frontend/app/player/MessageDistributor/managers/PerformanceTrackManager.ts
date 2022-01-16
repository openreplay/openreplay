import type { PerformanceTrack, SetPageVisibility } from '../messages';

import ListWalker from './ListWalker';

export type PerformanceChartPoint = {
	time: number,
	usedHeap: number,
	totalHeap: number,
	fps?: number,
	cpu?: number,
	nodesCount: number,
}

export default class PerformanceTrackManager extends ListWalker<PerformanceTrack> {
	private chart: Array<PerformanceChartPoint> = [];
	private isHidden: boolean = false;
	private timeCorrection: number = 0;
	private heapAvaliable: boolean = false;
	private fpsAvaliable: boolean = false;
	private cpuAvaliable: boolean = false;
	private prevTime: number | null = null;
	private prevNodesCount: number = 0;


	add(msg: PerformanceTrack):void {
		let fps: number | undefined;
		let cpu: number | undefined;
		if (!this.isHidden && this.prevTime != null) {
			let timePassed = msg.time - this.prevTime + this.timeCorrection;

			if (timePassed > 0 && msg.frames >= 0) {
				if (msg.frames > 0) { this.fpsAvaliable = true; }
				fps = msg.frames*1e3/timePassed; // Multiply by 1e3 as time in ms;
				fps = Math.min(fps,60); // What if 120?  TODO: alert if more than 60
				if (this.chart.length === 1) {
					this.chart[0].fps = fps;
				}
			}

			if (timePassed > 0 && msg.ticks >= 0) {
				this.cpuAvaliable = true;
				let tickRate = msg.ticks * 30 / timePassed;
				if (tickRate > 1) {
					tickRate = 1;
				}
				cpu = Math.round(100 - tickRate*100);
				if (this.chart.length === 1) {
					this.chart[0].cpu = cpu;
				}
			}
		}

		this.prevTime = msg.time;
		this.timeCorrection = 0

		this.heapAvaliable = this.heapAvaliable || msg.usedJSHeapSize > 0;
		this.chart.push({
			usedHeap: msg.usedJSHeapSize,
			totalHeap: msg.totalJSHeapSize,
			fps,
			cpu,
			time: msg.time,
			nodesCount: this.prevNodesCount,
		});
		super.add(msg);
	}

	setCurrentNodesCount(count: number) {
		this.prevNodesCount = count;
		if (this.chart.length > 0) {
			this.chart[ this.chart.length - 1 ].nodesCount = count;
		}
	} 

	handleVisibility(msg: SetPageVisibility):void {
		if (!this.isHidden && msg.hidden && this.prevTime != null) {
			this.timeCorrection = msg.time - this.prevTime;
		}
		if (this.isHidden && !msg.hidden) {
			this.prevTime = msg.time;
		}
		this.isHidden = msg.hidden;
	}

	get chartData(): Array<PerformanceChartPoint> {
		return this.chart;
	}

	get avaliability(): { cpu: boolean, fps: boolean, heap: boolean, nodes: boolean } {
		return {
			cpu: this.cpuAvaliable,
			fps: this.fpsAvaliable,
			heap: this.heapAvaliable,
			nodes: true,
		}
	}

}
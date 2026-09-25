import ListWalker from '../../common/ListWalker';
import type { IosPerformanceEvent } from '../../web/messages';

const performanceEvTypes = {
  MemoryUsage: 'memoryUsage',
  MainThreadCPU: 'mainThreadCPU',
  Background: 'background',
};
const SUPPORTED_TYPES = new Set(Object.values(performanceEvTypes));

export type PerformanceChartPoint = {
  time: number;
  cpu: number | null;
  memory: number | null;
  isBackground: boolean;
};

export default class IOSPerformanceTrackManager extends ListWalker<IosPerformanceEvent> {
  private chart: Array<PerformanceChartPoint> = [];

  private isInBg = false;

  lastData: { cpu: number | null; memory: number | null } = {
    cpu: null,
    memory: null,
  };

  private pushPoint(point: PerformanceChartPoint) {
    const { chart } = this;
    if (!chart.length || chart[chart.length - 1].time <= point.time) {
      chart.push(point);
      return;
    }
    let i = chart.length;
    while (i > 0 && chart[i - 1].time > point.time) i--;
    chart.splice(i, 0, point);
  }

  append(msg: IosPerformanceEvent): void {
    if (!SUPPORTED_TYPES.has(msg.name)) {
      return;
    }

    let cpu: number | null = null;
    let memory: number | null = null;
    if (msg.time < 0) msg.time = 1;
    if (msg.name === performanceEvTypes.Background) {
      // @ts-ignore
      const isBackground = msg.value === 1;
      if (isBackground === this.isInBg) return;
      this.isInBg = isBackground;
      this.pushPoint({
        time: msg.time,
        cpu: null,
        memory: null,
        isBackground,
      });
      return super.append(msg);
    }
    if (msg.name === performanceEvTypes.MemoryUsage) {
      memory = msg.value;
      cpu = this.lastData.cpu;
      this.lastData.memory = memory;
    }
    if (msg.name === performanceEvTypes.MainThreadCPU) {
      cpu = msg.value;
      memory = this.lastData.memory;
      this.lastData.cpu = cpu;
    }

    this.pushPoint({
      time: msg.time,
      cpu,
      memory,
      isBackground: false,
    });
    super.append(msg);
  }

  get chartData(): Array<PerformanceChartPoint> {
    return this.chart;
  }
}

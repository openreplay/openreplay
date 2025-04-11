import * as echarts from 'echarts/core';
import {
  DatasetComponent,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  // TransformComponent,
  ToolboxComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';

echarts.use([
  DatasetComponent,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  // TransformComponent,
  SVGRenderer,
  ToolboxComponent,
]);

const defaultOptions = {
  aria: {
    enabled: true,
    decal: {
      show: true,
    },
  },
  tooltip: {
    trigger: 'item',
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    extraCssText: 'box-shadow: none; pointer-events: auto;',
    axisPointer: {
      type: 'cross',
      snap: true,
      label: {
        backgroundColor: '#6a7985',
      },
    },
  },
  grid: {
    bottom: 20,
    top: 40,
    left: 35,
    right: 15,
    containLabel: true,
  },
  toolbox: {
    show: true,
    right: 10,
    top: 10,
    feature: {
      saveAsImage: {
        pixelRatio: 1.5,
      },
    },
  },
  legend: {
    type: 'plain',
    show: true,
    top: 10,
    icon: 'pin',
  },
};

export function initWindowStorages(
  chartUuid: string,
  categories: string[] = [],
  chartArr: any[] = [],
  compChartArr: any[] = [],
) {
  (window as any).__seriesValueMap = (window as any).__seriesValueMap ?? {};
  (window as any).__seriesColorMap = (window as any).__seriesColorMap ?? {};
  (window as any).__timestampMap = (window as any).__timestampMap ?? {};
  (window as any).__timestampCompMap = (window as any).__timestampCompMap ?? {};
  (window as any).__categoryMap = (window as any).__categoryMap ?? {};

  if (!(window as any).__seriesColorMap[chartUuid]) {
    (window as any).__seriesColorMap[chartUuid] = {};
  }
  if (!(window as any).__seriesValueMap[chartUuid]) {
    (window as any).__seriesValueMap[chartUuid] = {};
  }
  if (!(window as any).__categoryMap[chartUuid]) {
    (window as any).__categoryMap[chartUuid] = categories;
  }
  if (!(window as any).__timestampMap[chartUuid]) {
    (window as any).__timestampMap[chartUuid] = chartArr.map(
      (item) => item.timestamp,
    );
  }
  if (!(window as any).__timestampCompMap[chartUuid]) {
    (window as any).__timestampCompMap[chartUuid] = compChartArr.map(
      (item) => item.timestamp,
    );
  }
}

export { echarts, defaultOptions };

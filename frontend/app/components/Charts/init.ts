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
  ToolboxComponent
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
      label: {
        backgroundColor: '#6a7985'
      },
    }
  },
  grid: {
    bottom: 20,
    top: 40,
    left: 55,
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
      }
    }
  },
  legend: {
    type: 'plain',
    show: true,
    top: 10,
    icon: 'pin'
  },
}

export { echarts, defaultOptions };
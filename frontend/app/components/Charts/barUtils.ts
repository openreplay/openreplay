import type { DataProps, DataItem } from './utils';
import {
  createDataset,
  assignColorsByBaseName,
  assignColorsByCategory,
} from './utils';

export function createBarSeries(
  data: DataProps['data'],
  datasetId: string,
  dashed: boolean,
  hideFromLegend: boolean,
) {
  return data.namesMap.filter(Boolean).map((fullName) => {
    const baseName = fullName.replace(/^Previous\s+/, '');

    const encode = { x: 'idx', y: fullName };

    const borderRadius = [6, 6, 0, 0];
    const decal = dashed
      ? { symbol: 'line', symbolSize: 10, rotation: 1 }
      : { symbol: 'none' };
    return {
      name: fullName,
      _baseName: baseName,
      type: 'bar',
      datasetId,
      animation: false,
      encode,
      showSymbol: false,
      itemStyle: { borderRadius, decal },
      _hideInLegend: hideFromLegend,
    };
  });
}

export function buildBarDatasetsAndSeries(props: DataProps) {
  const mainDataset = createDataset('current', props.data);
  const mainSeries = createBarSeries(props.data, 'current', false, false);

  let compDataset: Record<string, any> | null = null;
  let compSeries: Record<string, any>[] = [];
  if (props.compData && props.compData.chart?.length) {
    compDataset = createDataset('previous', props.compData);
    compSeries = createBarSeries(props.compData, 'previous', true, true);
  }

  const datasets = compDataset ? [mainDataset, compDataset] : [mainDataset];
  const series = [...mainSeries, ...compSeries];

  assignColorsByBaseName(series);

  return { datasets, series };
}

// START GEN
function sumSeries(chart: DataItem[], seriesName: string): number {
  return chart.reduce((acc, row) => acc + (Number(row[seriesName]) || 0), 0);
}

/**
 * Build a horizontal bar chart with:
 * - yAxis categories = each name in data.namesMap
 * - 1 bar series for "Current"
 * - 1 bar series for "Previous" (optional, if compData present)
 */
export function buildColumnChart(
  chartUuid: string,
  data: DataProps['data'],
  compData: DataProps['compData'],
) {
  const categories = data.namesMap.filter(Boolean);

  const currentValues = categories.map((name) => {
    const val = sumSeries(data.chart, name);
    (window as any).__seriesValueMap[chartUuid][name] = val;
    return val;
  });

  let previousValues: number[] = [];
  if (compData && compData.chart?.length) {
    previousValues = categories.map((name) => {
      const val = sumSeries(compData.chart, `Previous ${name}`);
      (window as any).__seriesValueMap[chartUuid][`Previous ${name}`] = val;
      return val;
    });
  }

  const currentSeries = {
    name: 'Current',
    type: 'bar',
    barWidth: 16,
    data: currentValues,
    _baseName: 'Current',
    itemStyle: {
      borderRadius: [0, 6, 6, 0],
    },
  };

  let previousSeries: any = null;
  if (previousValues.length > 0) {
    previousSeries = {
      name: 'Previous',
      type: 'bar',
      barWidth: 16,
      data: previousValues,
      _baseName: 'Previous',
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        decal: {
          show: true,
          symbol: 'line',
          symbolSize: 6,
          rotation: 1,
          dashArrayX: 4,
          dashArrayY: 4,
        },
      },
    };
  }

  const series = previousSeries
    ? [currentSeries, previousSeries]
    : [currentSeries];

  assignColorsByCategory(series, categories);

  series.forEach((s) => {
    (window as any).__seriesColorMap[chartUuid][s.name] = s.itemStyle.color;
  });

  return {
    yAxisData: categories,
    series,
  };
}

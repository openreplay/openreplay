import type { DataProps, DataItem } from './utils';
import { createDataset, assignColorsByBaseName } from './utils';

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
    const decal = dashed ? { symbol: 'line', symbolSize: 10, rotation: 1 } : { symbol: 'none' };
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


function sumSeries(chart: DataItem[], seriesName: string): number {
  return chart.reduce((acc, row) => acc + (Number(row[seriesName]) || 0), 0);
}

export function buildColumnChart(chartUuid: string, data: DataProps['data'], compData: DataProps['compData'],) {
  const baseNamesSet = new Set<string>();

  data.namesMap.filter(Boolean).forEach((fullName) => {
    const baseName = fullName.replace(/^Previous\s+/, '');
    baseNamesSet.add(baseName);
  });

  if (compData && compData.chart?.length) {
    compData.namesMap.filter(Boolean).forEach((fullName) => {
      const baseName = fullName.replace(/^Previous\s+/, '');
      baseNamesSet.add(baseName);
    });
  }

  const baseNames = Array.from(baseNamesSet); // e.g. ["Series 1","Series 2"]

  const yAxisData = baseNames;

  const series: any[] = [];

  data.namesMap.filter(Boolean).forEach((fullName) => {
    const baseName = fullName.replace(/^Previous\s+/, '');
    const idx = baseNames.indexOf(baseName);

    const val = sumSeries(data.chart, fullName);
    const dataArr = new Array(baseNames.length).fill(0);
    dataArr[idx] = val;
    (window as any).__seriesValueMap[chartUuid][
      `Previous ${fullName}`
      ] = val;
    series.push({
      name: fullName,
      type: 'bar',
      barWidth: 16,
      data: dataArr,
      _hideInLegend: false,
      _baseName: baseName,
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
      },
    });
  });

  if (compData && compData.chart?.length) {
    compData.namesMap.filter(Boolean).forEach((fullName) => {
      const baseName = fullName.replace(/^Previous\s+/, '');
      const idx = baseNames.indexOf(baseName);
      const val = sumSeries(compData.chart, fullName);

      const dataArr = new Array(baseNames.length).fill(0);
      dataArr[idx] = val;
      (window as any).__seriesValueMap[chartUuid][baseName] = val;
      series.push({
        name: fullName,
        type: 'bar',
        barWidth: 16,
        barGap: '1%',
        data: dataArr,
        _hideInLegend: true,
        _baseName: baseName,
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
      });
    });
  }

  assignColorsByBaseName(series);
  series.forEach((s) => {
    (window as any).__seriesColorMap[chartUuid][s.name] =
      s.itemStyle.color;
  });

  return {
    yAxisData,
    series,
  }
}
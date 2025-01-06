import type { DataProps } from './utils';
import { createDataset, assignColorsByBaseName } from './utils';

export function createBarSeries(
  data: DataProps['data'],
  datasetId: string,
  dashed: boolean,
  hideFromLegend: boolean,
  horizontal: boolean
) {
  return data.namesMap.filter(Boolean).map((fullName) => {
    const baseName = fullName.replace(/^Previous\s+/, '');

    const encode = horizontal
                   ? { x: fullName, y: 'idx' }
                   : { x: 'idx', y: fullName };

    const borderRadius = horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0];
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

export function buildBarDatasetsAndSeries(props: DataProps, horizontal = false) {
  const mainDataset = createDataset('current', props.data);
  const mainSeries = createBarSeries(props.data, 'current', false, false, horizontal);

  let compDataset: Record<string, any> | null = null;
  let compSeries: Record<string, any>[] = [];
  if (props.compData && props.compData.chart?.length) {
    compDataset = createDataset('previous', props.compData);
    compSeries = createBarSeries(props.compData, 'previous', true, true, horizontal);
  }

  const datasets = compDataset ? [mainDataset, compDataset] : [mainDataset];
  const series = [...mainSeries, ...compSeries];

  assignColorsByBaseName(series);

  return { datasets, series };
}


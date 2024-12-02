import React from 'react';

interface Props {
  data: { chart: any[], namesMap: string[] };
  compData: { chart: any[], namesMap: string[] } | null;
  params: any;
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
}

function ProgressBarChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    compData = { chart: [], namesMap: [] },
    colors,
    onClick = () => null,
    label = 'Number of Sessions',
  } = props;

  const getTotalForSeries = (series: string, isComp: boolean) => {
    if (isComp) {
      if (!compData) return 0;
      return compData.chart.reduce((acc, curr) => acc + curr[series], 0);
    }
    return data.chart.reduce((acc, curr) => acc + curr[series], 0);
  }

  const formattedNumber = (num: number) => {
    return Intl.NumberFormat().format(num);
  }

  // we mix 1 original, then 1 comparison, etc
  const mergedNameMap: { data: any, isComp: boolean, index: number }[] = [];
  for (let i = 0; i < data.namesMap.length; i++) {
    if (!data.namesMap[i]) {
      continue;
    }
    mergedNameMap.push({ data: data.namesMap[i], isComp: false, index: i });
    if (compData && compData.namesMap[i]) {
      mergedNameMap.push({ data: compData.namesMap[i], isComp: true, index: i });
    }
  }

  const values = mergedNameMap.map((k, i) => {
    return {
      name: k.data,
      value: getTotalForSeries(k.data, k.isComp),
      isComp: k.isComp,
      index: k.index,
    }
  })
  const highest = values.reduce(
    (acc, curr) =>
      acc.value > curr.value ? acc : curr,
    { name: '', value: 0 });
  return (
    <div className={'w-full'} style={{ height: 240 }}>
      {values.map((val, i) => (
        <div key={i} className={'flex items-center gap-1'}>
          <div className={'flex items-center'} style={{ flex: 1}}>
            <div className={'w-4 h-4 rounded-full mr-2'} style={{ backgroundColor: colors[val.index] }} />
            <span>{val.name}</span>
          </div>
          <div className={'flex items-center gap-2'} style={{ flex: 4 }}>
            <div style={{
              height: 16,
              borderRadius: 16,
              backgroundImage: val.isComp ? `linear-gradient(45deg, #ffffff 25%, ${colors[val.index]} 25%, ${colors[val.index]} 50%, #ffffff 50%, #ffffff 75%, ${colors[val.index]} 75%, ${colors[val.index]} 100%)` : undefined,
              backgroundSize: val.isComp ? '20px 20px' : undefined,
              backgroundColor: val.isComp ? undefined : colors[val.index],
              width: `${(val.value/highest.value)*100}%` }}
            />
            <div>{formattedNumber(val.value)}</div>
          </div>
          <div style={{ flex: 1}}/>
        </div>
      ))}
    </div>
  );
}

export default ProgressBarChart;

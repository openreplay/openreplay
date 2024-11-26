import React from 'react';

interface Props {
  data: { chart: any[], namesMap: string[] };
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
    colors,
    onClick = () => null,
    label = 'Number of Sessions',
  } = props;

  const getTotalForSeries = (series: string) => {
    return data.chart.reduce((acc, curr) => acc + curr[series], 0);
  }
  const values = data.namesMap.map((k, i) => {
    return {
      name: k,
      value: getTotalForSeries(k)
    }
  })
  const highest = values.reduce(
    (acc, curr) =>
      acc.value > curr.value ? acc : curr,
    { name: '', value: 0 });

  const formattedNumber = (num: number) => {
    return Intl.NumberFormat().format(num);
  }
  return (
    <div className={'w-full'} style={{ height: 240 }}>
      {values.map((val, i) => (
        <div key={i} className={'flex items-center gap-1'}>
          <div className={'flex items-center'} style={{ flex: 1}}>
            <div className={'w-4 h-4 rounded-full mr-2'} style={{ backgroundColor: colors[i] }} />
            <span>{val.name}</span>
          </div>
          <div className={'flex items-center gap-2'} style={{ flex: 4 }}>
            <div style={{ height: 16, borderRadius: 16, backgroundColor: colors[i], width: `${(val.value/highest.value)*100}%` }} />
            <div>{formattedNumber(val.value)}</div>
          </div>
          <div style={{ flex: 1}}/>
        </div>
      ))}
    </div>
  );
}

export default ProgressBarChart;

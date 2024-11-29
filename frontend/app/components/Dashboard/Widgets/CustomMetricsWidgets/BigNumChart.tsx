import React from 'react'
import { CompareTag } from "./CustomChartTooltip";

interface Props {
  data: { chart: any[], namesMap: string[] };
  compData: { chart: any[], namesMap: string[] } | null;
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
}
function BigNumChart(props: Props) {
  const {
    data = { chart: [], namesMap: [] },
    compData = { chart: [], namesMap: [] },
    colors,
    onClick = () => null,
    label = 'Number of Sessions',
  } = props;

  const values: { value: number, compData?: number, series: string }[] = [];
  for (let i = 0; i < data.namesMap.length; i++) {
    if (!data.namesMap[i]) {
      continue;
    }

    values.push({
      value: data.chart.reduce((acc, curr) => acc + curr[data.namesMap[i]], 0),
      compData: compData ? compData.chart.reduce((acc, curr) => acc + curr[compData.namesMap[i]], 0) : undefined,
      series: data.namesMap[i],
    });
  }
  console.log(values, data, compData)
  return (
    <div className={'flex justify-around gap-2 w-full'} style={{ height: 240 }}>
      {values.map((val, i) => (
        <BigNum
          key={i}
          color={colors[i]}
          series={val.series}
          value={val.value}
          label={label}
          compData={val.compData}
        />
      ))}
    </div>
  )
}

function BigNum({ color, series, value, label, compData }: {
  color: string,
  series: string,
  value: number,
  label: string,
  compData?: number,
}) {
  const formattedNumber = (num: number) => {
    return Intl.NumberFormat().format(num);
  }

  const changePercent = React.useMemo(() => {
    if (!compData) return 0;
    return `${(((value - compData) / compData) * 100).toFixed(2)}%`;
  }, [value, compData])
  return (
    <div className={'flex flex-col gap-2 py-8 items-center'}>
      <div className={'flex items-center gap-2 font-semibold text-gray-darkest'}>
        <div className={'rounded w-4 h-4'} style={{ background: color }} />
        <div>{series}</div>
      </div>
      <div className={'font-bold leading-none'} style={{ fontSize: 56 }}>
        {formattedNumber(value)}
      </div>
      <div className={'text-disabled-text text-xs'}>
        {label}
      </div>
      {compData ? (
        <CompareTag isHigher={value > compData} prevValue={changePercent} />
      ) : null}
    </div>
  )
}

export default BigNumChart;
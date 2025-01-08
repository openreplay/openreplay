import React from 'react'
import { CompareTag } from "./CustomChartTooltip";

interface Props {
  colors: any;
  onClick?: (event, index) => void;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
  values: { value: number, compData?: number, series: string, valueLabel?: string }[];
}
function BigNumChart(props: Props) {
  const {
    colors,
    label = 'Number of Sessions',
    values,
  } = props;
  return (
    <div className={'flex flex-row flex-wrap gap-2'} style={{ height: 240 }}>
      {values.map((val, i) => (
        <BigNum
          key={i}
          color={colors[i]}
          series={val.series}
          value={val.value}
          label={label}
          compData={val.compData}
          valueLabel={val.valueLabel}
        />
      ))}
    </div>
  )
}

function BigNum({ color, series, value, label, compData, valueLabel }: {
  color: string,
  series: string,
  value: number,
  label: string,
  compData?: number,
  valueLabel?: string,
}) {
  const formattedNumber = (num: number) => {
    return Intl.NumberFormat().format(num);
  }

  const changePercent = React.useMemo(() => {
    if (!compData || compData === 0) return '0%';
    return `${(((value - compData) / compData) * 100).toFixed(2)}%`;
  }, [value, compData])
  const change = React.useMemo(() => {
    if (!compData) return 0;
    return value - compData;
  }, [value, compData])
  return (
    <div className={'flex flex-col flex-auto justify-center items-center rounded-lg transition-all hover:transition-all ease-in-out hover:ease-in-out hover:bg-teal/5 hover:cursor-pointer'}>
      <div className={'flex items-center gap-2 font-medium text-gray-darkest'}>
        <div className={'rounded w-4 h-4'} style={{ background: color }} />
        <div>{series}</div>
      </div>
      <div className={'font-bold leading-none'} style={{ fontSize: 56 }}>
        {formattedNumber(value)}{valueLabel ? `${valueLabel}` : null}
      </div>
      <div className={'text-disabled-text text-xs'}>
        {label}
      </div>
      {compData ? (
        <CompareTag isHigher={value > compData} absDelta={change} delta={changePercent} />
      ) : null}
    </div>
  )
}

export default BigNumChart;
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
    <div className={'flex justify-around gap-2 w-full'} style={{ height: 240 }}>
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
  return (
    <div className={'flex flex-col gap-2 py-8 items-center'}>
      <div className={'flex items-center gap-2 font-semibold text-gray-darkest'}>
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
        <CompareTag isHigher={value > compData} prevValue={changePercent} />
      ) : null}
    </div>
  )
}

export default BigNumChart;
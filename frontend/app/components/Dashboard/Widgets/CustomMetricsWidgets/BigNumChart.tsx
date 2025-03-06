import React from 'react';
import cn from 'classnames';
import { CompareTag } from './CustomChartTooltip';

interface Props {
  colors: any;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
  values: {
    value: number;
    compData?: number;
    series: string;
    valueLabel?: string;
  }[];
  onSeriesFocus?: (name: string) => void;
}
function BigNumChart(props: Props) {
  const {
    colors,
    label = 'Number of Sessions',
    values,
    onSeriesFocus,
    hideLegend,
  } = props;
  return (
    <div className="pb-3">
      <div className="flex flex-row flex-wrap gap-2" style={{ height: 240 }}>
        {values.map((val, i) => (
          <BigNum
            key={i}
            hideLegend={hideLegend}
            color={colors[i]}
            series={val.series}
            value={val.value}
            label={label}
            compData={val.compData}
            valueLabel={val.valueLabel}
            onSeriesFocus={onSeriesFocus}
          />
        ))}
      </div>
    </div>
  );
}

function BigNum({
  color,
  series,
  value,
  label,
  compData,
  valueLabel,
  onSeriesFocus,
  hideLegend,
}: {
  color: string;
  series: string;
  value: number;
  label: string;
  compData?: number;
  valueLabel?: string;
  onSeriesFocus?: (name: string) => void;
  hideLegend?: boolean;
}) {
  const formattedNumber = (num: number) => Intl.NumberFormat().format(num);

  const changePercent = React.useMemo(() => {
    if (!compData || compData === 0) return '0';
    return `${(((value - compData) / compData) * 100).toFixed(2)}`;
  }, [value, compData]);
  const change = React.useMemo(() => {
    if (!compData) return 0;
    return value - compData;
  }, [value, compData]);
  return (
    <div
      onClick={() => onSeriesFocus?.(series)}
      className={cn(
        'flex flex-col flex-auto justify-center items-center rounded-lg transition-all',
        'hover:transition-all ease-in-out hover:ease-in-out hover:bg-teal/5 hover:cursor-pointer',
      )}
    >
      {hideLegend ? null : (
        <div className="flex items-center gap-2 font-medium text-gray-darkest">
          <div className="rounded w-4 h-4" style={{ background: color }} />
          <div>{series}</div>
        </div>
      )}
      <div className="font-bold leading-none" style={{ fontSize: 56 }}>
        {formattedNumber(value)}
        {valueLabel ? `${valueLabel}` : null}
      </div>
      <div className="text-disabled-text text-xs">{label}</div>
      {compData ? (
        <CompareTag
          isHigher={value > compData}
          absDelta={change}
          delta={changePercent}
        />
      ) : null}
    </div>
  );
}

export default BigNumChart;

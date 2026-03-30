import React from 'react';
import { Tooltip } from 'antd';
import cn from 'classnames';
import { CompareTag } from './CustomChartTooltip';

interface Props {
  colors: any;
  yaxis?: any;
  label?: string;
  hideLegend?: boolean;
  height?: number;
  inGrid?: boolean;
  onClick?: (event: any) => void;
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
    height,
  } = props;
  const count = values.length;
  const columnCount = Math.min(count, 5);
  return (
    <div className="pb-3">
      <div
        className="grid gap-2"
        style={{
          height: height ?? 240,
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          ...(props.inGrid ? {} : { overflowY: 'auto' as const }),
        }}
      >
        {values.map((val, i) => (
          <BigNum
            key={i}
            hideLegend={hideLegend}
            color={colors[i % colors.length]}
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
        'flex flex-col flex-auto justify-center items-center rounded-lg transition-all min-w-0 px-2',
        'hover:transition-all ease-in-out hover:ease-in-out hover:bg-teal/5 hover:cursor-pointer',
      )}
    >
      {hideLegend ? null : (
        <Tooltip title={series}>
          <div className="flex items-center gap-2 font-medium text-gray-darkest max-w-full">
            <div
              className="rounded-sm w-4 h-4 shrink-0"
              style={{ background: color }}
            />
            <div className="truncate">{series}</div>
          </div>
        </Tooltip>
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

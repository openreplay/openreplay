import React from 'react';
import { formatTimeOrDate } from 'App/date';
import cn from 'classnames';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface PayloadItem {
  hide?: boolean;
  name: string;
  value: number;
  prevValue?: number;
}
interface Props {
  active: boolean;
  payload: PayloadItem[];
  label: string;
  activeKey?: string;
}

function CustomTooltip(props: Props) {
  const { active, payload, label, activeKey } = props;
  if (!active || !payload?.length) return null;

  const shownPayloads: PayloadItem[] = payload.filter((p) => !p.hide);
  const currentSeries: PayloadItem[] = [];
  const previousSeriesMap: Record<string, any> = {};

  shownPayloads.forEach((item) => {
    if (item.name.startsWith('Previous ')) {
      const originalName = item.name.replace('Previous ', '');
      previousSeriesMap[originalName] = item.value;
    } else {
      currentSeries.push(item);
    }
  });

  const transformedArray = currentSeries.map((item) => {
    const prevValue = previousSeriesMap[item.name] || null;
    return {
      ...item,
      prevValue,
    };
  });

  const isHigher = (item: { value: number; prevValue: number }) => {
    return item.prevValue !== null && item.prevValue < item.value;
  };
  const getPercentDelta = (val, prevVal) => {
    return (((val - prevVal) / prevVal) * 100).toFixed(2);
  };
  return (
    <div
      className={'flex flex-col gap-1 bg-white shadow border rounded p-2 z-30'}
    >
      {transformedArray.map((p, index) => (
        <React.Fragment key={p.name + index}>
          <div className={'flex gap-2 items-center'}>
            <div
              style={{ borderRadius: 99, background: p.color }}
              className={'h-5 w-5 flex items-center justify-center'}
            >
              <div className={'invert text-sm'}>{index + 1}</div>
            </div>
            <div className={'font-medium'}>{p.name}</div>
          </div>
          <div
            style={{ borderLeft: `2px solid ${p.color}` }}
            className={'flex flex-col py-2 px-2 ml-2'}
          >
            <div className={'text-disabled-text text-sm'}>
              {label}, {formatTimeOrDate(p.payload.timestamp)}
            </div>
            <div className={'flex items-center gap-1'}>
              <div className={'font-medium'}>{p.value}</div>
              {p.prevValue ? (
                <CompareTag
                  isHigher={isHigher(p)}
                  absDelta={Math.abs(p.value - p.prevValue)}
                  delta={getPercentDelta(p.value, p.prevValue)}
                />
              ) : null}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export function CompareTag({
  isHigher,
  absDelta,
  delta,
}: {
  isHigher: boolean;
  absDelta?: number | string;
  delta?: string;
}) {
  return (
    <div
      className={cn(
        'px-2 py-1 w-fit rounded flex items-center gap-1',
        isHigher ? 'bg-green2 text-xs' : 'bg-red2 text-xs'
      )}
    >
      {!isHigher ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
      <div>{absDelta}</div>
      <div>({delta}%)</div>
    </div>
  );
}

export default CustomTooltip;

import React from 'react';
import { formatTimeOrDate } from 'App/date';
import cn from 'classnames';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PayloadItem {
  hide?: boolean;
  name: string;
  value: number;
  prevValue?: number;
  color?: string;
  payload?: any;
}

interface Props {
  active: boolean;
  payload: PayloadItem[];
  label: string;
  hoveredSeries?: string | null;
}

function CustomTooltip(props: Props) {
  const { t } = useTranslation();
  const { active, payload, label, hoveredSeries = null } = props;

  // Return null if tooltip is not active or there is no valid payload
  if (!active || !payload?.length || !hoveredSeries) return null;

  // Find the current and comparison payloads
  const currentPayload = payload.find((p) => p.name === hoveredSeries);
  const comparisonPayload = payload.find(
    (p) =>
      p.name === `${hoveredSeries.replace(' (Comparison)', '')} (Comparison)` ||
      p.name === `${hoveredSeries} (Comparison)`,
  );

  if (!currentPayload) return null;

  // Create transformed array with comparison data
  const transformedArray = [
    {
      ...currentPayload,
      prevValue: comparisonPayload ? comparisonPayload.value : null,
    },
  ];

  const isHigher = (item: { value: number; prevValue: number }) =>
    item.prevValue !== null && item.prevValue < item.value;

  const getPercentDelta = (val: number, prevVal: number) =>
    (((val - prevVal) / prevVal) * 100).toFixed(2);

  return (
    <div className="flex flex-col gap-1 bg-white shadow border rounded p-2 z-50">
      {transformedArray.map((p, index) => (
        <React.Fragment key={p.name + index}>
          <div className="flex gap-2 items-center">
            <div
              style={{ borderRadius: 99, background: p.color }}
              className="h-5 w-5 flex items-center justify-center"
            >
              <div className="invert text-sm">{index + 1}</div>
            </div>
            <div className="font-medium">{p.name}</div>
          </div>
          <div
            style={{ borderLeft: `2px solid ${p.color}` }}
            className="flex flex-col px-2 ml-2"
          >
            <div className="text-neutral-600 text-sm">
              {label},{' '}
              {p.payload?.timestamp ? (
                formatTimeOrDate(p.payload.timestamp)
              ) : (
                <div className="hidden">
                  &apos;{t('Timestamp is not Applicable')}&apos;
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className="font-medium">{p.value}</div>

              <CompareTag
                isHigher={isHigher(p)}
                absDelta={Math.abs(p.value - p.prevValue)}
                delta={getPercentDelta(p.value, p.prevValue)}
              />
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
  isHigher: boolean | null; // Allow null for default view
  absDelta?: number | string | null;
  delta?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'px-2 py-1 w-fit rounded flex items-center gap-1',
        isHigher === null
          ? 'bg-neutral-200 text-neutral-600 text-xs'
          : isHigher
            ? 'bg-green2/10 text-xs'
            : 'bg-red2/10 text-xs',
      )}
    >
      {isHigher === null ? (
        <div>{t('No Comparison')}</div>
      ) : (
        <>
          {!isHigher ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
          <div>{absDelta}</div>
          <div>
            ({delta}
            %)
          </div>
        </>
      )}
    </div>
  );
}

export default CustomTooltip;

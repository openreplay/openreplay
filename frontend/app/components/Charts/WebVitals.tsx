import React from 'react';
import cn from 'classnames';
import { Select } from 'antd';
import { X } from 'lucide-react';

interface Stats {
  Min: number;
  Avg: number;
  Max: number;
  P50: number;
  P75: number;
  P90: number;
  MinStatus: 'good' | 'medium' | 'bad';
  AvgStatus: 'good' | 'medium' | 'bad';
  MaxStatus: 'good' | 'medium' | 'bad';
  P50Status: 'good' | 'medium' | 'bad';
  P75Status: 'good' | 'medium' | 'bad';
  P90Status: 'good' | 'medium' | 'bad';
}

interface WVData {
  domBuildingTime: Stats;
  ttfb: Stats;
  speedIndex: Stats;
  firstContentfulPaintTime: Stats;
  raw?: any;
}

const defaultStats = {
  Min: 0,
  Avg: 0,
  Max: 0,
  P50: 0,
  P75: 0,
  P90: 0,
  MinStatus: 'good',
  AvgStatus: 'good',
  MaxStatus: 'good',
  P50Status: 'good',
  P75Status: 'good',
  P90Status: 'good',
} as const;
const defaults = {
  domBuildingTime: defaultStats,
  ttfb: defaultStats,
  speedIndex: defaultStats,
  firstContentfulPaintTime: defaultStats,
} as const;

function WebVitals({
  data,
  onFocus,
}: {
  data?: Partial<WVData> | null;
  onFocus?: (filters: any[]) => void;
}) {
  const [selectedCard, setSelectedCard] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<'P50' | 'P75' | 'Min' | 'Avg' | 'Max'>(
    'P50',
  );

  const webVitalsData: WVData = {
    domBuildingTime: {
      ...defaults.domBuildingTime,
      ...data?.domBuildingTime,
    },
    ttfb: {
      ...defaults.ttfb,
      ...data?.ttfb,
    },
    speedIndex: {
      ...defaults.speedIndex,
      ...data?.speedIndex,
    },
    firstContentfulPaintTime: {
      ...defaults.firstContentfulPaintTime,
      ...data?.firstContentfulPaintTime,
    },
  };
  const metrics = [
    {
      name: 'DOM',
      metricKey: 'domBuildingTime',
      value: webVitalsData.domBuildingTime[mode],
      description: 'DOM Complete',
      status: webVitalsData.domBuildingTime[`${mode}Status`],
    },
    {
      name: 'TTFB',
      metricKey: 'ttfb',
      value: webVitalsData.ttfb[mode],
      description: 'Time to First Byte',
      status: webVitalsData.ttfb[`${mode}Status`],
    },
    {
      name: 'SI',
      metricKey: 'speedIndex',
      value: webVitalsData.speedIndex[mode],
      description: 'Speed Index',
      status: webVitalsData.speedIndex[`${mode}Status`],
    },
    {
      name: 'FCP',
      metricKey: 'firstContentfulPaintTime',
      value: webVitalsData.firstContentfulPaintTime[mode],
      description: 'First Contentful Paint',
      status: webVitalsData.firstContentfulPaintTime[`${mode}Status`],
    },
  ];

  const onMetricClick = (
    metricName:
      | 'domBuildingTime'
      | 'ttfb'
      | 'speedIndex'
      | 'firstContentfulPaintTime'
      | null,
    status: 'good' | 'medium' | 'bad',
  ) => {
    if (!data) return;
    if (metricName === selectedCard || metricName === null) {
      setSelectedCard(null);
      onFocus?.([]);
      return;
    }
    const upCaseStatus = status.charAt(0).toUpperCase() + status.slice(1);
    const filters: any[] = [];
    const keys = data.raw[`${metricName}${upCaseStatus}`]; // [start, end?];
    const filterKey = data.raw[`${metricName}Key`];
    keys.forEach((key: string, i: number) => {
      const operator = i > 0 ? '<=' : '>=';
      const fValue = [key];
      let filter = {
        autoCaptured: true,
        type: filterKey,
        operator: operator,
        isEvent: false,
        hasSource: true,
        sourceOperator: operator,
        value: fValue,
      };
      filters.push(filter);
    });
    onFocus?.(filters);
    setSelectedCard(metricName);
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="font-semibold">Web Vitals</div>
          {selectedCard ? (
            <div
              className={cn(
                'cursor-pointer text-sm text-black opacity-60',
                'flex items-center gap-1 hover:opacity-100',
              )}
              onClick={() => onMetricClick(null, 'good')}
            >
              <div>
                {metrics.find((m) => m.metricKey === selectedCard)
                  ?.description ?? 'unknown metric'}
              </div>
              <X size={12} />
            </div>
          ) : null}
        </div>
        <div>
          <Select
            value={mode}
            popupMatchSelectWidth={false}
            onChange={(value) => setMode(value)}
            options={[
              { label: 'Median', value: 'P50' },
              { label: '75th percentile', value: 'P75' },
              { label: '90th percentile', value: 'P90' },
              { label: 'Avg', value: 'Avg' },
              { label: 'Min', value: 'Min' },
              { label: 'Max', value: 'Max' },
            ]}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <WebVitalsCard
            key={metric.name}
            metricKey={metric.metricKey}
            name={metric.name}
            value={metric.value}
            description={metric.description}
            status={metric.status}
            isSelected={selectedCard === metric.metricKey}
            onClick={onMetricClick}
          />
        ))}
      </div>
    </div>
  );
}

const colors = {
  good: 'green-light',
  medium: 'yellow',
  bad: 'red-light',
};

function WebVitalsCard({
  name,
  value,
  description,
  status,
  onClick,
  metricKey,
  isSelected,
}: {
  name: string;
  value: number;
  description: string;
  metricKey: string;
  status: 'good' | 'medium' | 'bad';
  onClick: (metricName: string, status: 'good' | 'medium' | 'bad') => void;
  isSelected: boolean;
}) {
  const bg = colors[status] ?? '#cccccc';
  const valueFormatted = value
    ? value > 1000
      ? `${(value / 1000).toFixed(2)}s`
      : `${Math.round(value)}ms`
    : 'N/A';
  return (
    <div
      className={cn(
        'flex justify-between items-start gap-2 p-4 border rounded-lg shadow-sm',
        `bg-${bg} cursor-pointer`,
        isSelected ? 'border-main' : 'border-transparent',
      )}
      onClick={() => onClick(metricKey, status)}
    >
      <div>
        <div className="text-lg font-semibold">{name}</div>
        <div className="text-sm text-disabled-text">{description}</div>
      </div>
      <div className="text-xl font-bold">{valueFormatted}</div>
    </div>
  );
}

export default WebVitals;

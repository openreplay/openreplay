import React from 'react';
import cn from 'classnames';
import { Select } from 'antd';

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

function WebVitals({ data }: { data?: Partial<WVData> | null }) {
  const [mode, setMode] = React.useState<'P50' | 'P75' | 'Min' | 'Avg' | 'Max'>(
    'P50',
  );
  console.log(data, defaults);
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
      value: webVitalsData.domBuildingTime[mode],
      description: 'DOM Complete',
      status: webVitalsData.domBuildingTime[`${mode}Status`],
    },
    {
      name: 'TTFB',
      value: webVitalsData.ttfb[mode],
      description: 'Time to First Byte',
      status: webVitalsData.ttfb[`${mode}Status`],
    },
    {
      name: 'SI',
      value: webVitalsData.speedIndex[mode],
      description: 'Speed Index',
      status: webVitalsData.speedIndex[`${mode}Status`],
    },
    {
      name: 'FCP',
      value: webVitalsData.firstContentfulPaintTime[mode],
      description: 'First Contentful Paint',
      status: webVitalsData.firstContentfulPaintTime[`${mode}Status`],
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="font-semibold">Web Vitals</div>
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
            name={metric.name}
            value={metric.value}
            description={metric.description}
            status={metric.status}
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
}: {
  name: string;
  value: number;
  description: string;
  status: 'good' | 'medium' | 'bad';
}) {
  const bg = colors[status];
  const valueFormatted =
    value > 1000 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;
  return (
    <div
      className={cn(
        'flex justify-between items-start gap-2 p-4 border rounded-lg shadow-sm',
        `bg-${bg}`,
      )}
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

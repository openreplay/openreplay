import { MenuButton } from '@/ui/actions/menu-button';
import { Chip } from '@/ui/data/Chip';
import { Sigma } from 'lucide-react';
import React from 'react';

import 'App/components/Dashboard/charts.css';

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

const filterKeys = {
  domBuildingTime: 'dom_building_time',
  ttfb: 'ttfb',
  speedIndex: 'speed_index',
  firstContentfulPaintTime: 'first_contentful_paint_time',
  lcp: 'LCP',
  cls: 'CLS',
};

interface WVData {
  domBuildingTime: Stats;
  ttfb: Stats;
  speedIndex: Stats;
  firstContentfulPaintTime: Stats;
  lcp: Stats;
  cls: Stats;
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
  lcp: defaultStats,
  cls: defaultStats,
} as const;

function WebVitals({
  data,
  onFocus,
  inGrid,
}: {
  data?: Partial<WVData> | null;
  onFocus?: (filters: any[]) => void;
  inGrid?: boolean;
}) {
  const [searchedBy, setSearchedBy] = React.useState<string | null>(null);
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
    lcp: {
      ...defaults.lcp,
      ...data?.lcp,
    },
    cls: {
      ...defaults.cls,
      ...data?.cls,
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
    {
      name: 'LCP',
      metricKey: 'lcp',
      value: webVitalsData.lcp[mode],
      description: 'Largest Contentful Paint',
      status: webVitalsData.lcp[`${mode}Status`],
    },
    {
      name: 'CLS',
      metricKey: 'cls',
      value: webVitalsData.cls[mode],
      description: 'Cumulative Layout Shift',
      status: webVitalsData.cls[`${mode}Status`],
    },
  ];

  const onMetricClick = (
    metricName:
      | 'domBuildingTime'
      | 'ttfb'
      | 'speedIndex'
      | 'firstContentfulPaintTime'
      | 'lcp'
      | 'cls'
      | null,
    status: 'good' | 'medium' | 'bad',
  ) => {
    if (!data) return;
    if (metricName === selectedCard || metricName === null) {
      setSelectedCard(null);
      onFocus?.([]);
      setSearchedBy(null);
      return;
    }
    const filterObj = {
      autoCaptured: true,
      type: filterKeys[metricName],
      name: filterKeys[metricName],
      operator: '',
      isEvent: false,
      hasSource: true,
      sourceOperator: '',
      value: [],
      propertyOrder: 'and',
    };
    const filters: any[] = [];
    if (['Min', 'Max'].includes(mode)) {
      filters.push({
        ...filterObj,
        operator: '=',
        sourceOperator: '=',
        value: [String(data.raw[metricName][mode])],
      });
      setSearchedBy(mode);
    } else {
      // [startVal, bottomValue]
      const keys = data.raw[metricName][status];
      keys.forEach((key: string, i: number) => {
        const operator = i > 0 ? '<=' : '>=';
        const fValue = [String(key)];
        filters.push({
          ...filterObj,
          operator: operator,
          sourceOperator: operator,
          value: fValue,
        });
      });
      const searchStr =
        keys.length === 2
          ? `from ${keys[0]}ms to ${keys[1]}ms`
          : `more than ${keys[0]}ms`;
      setSearchedBy(searchStr);
    }
    onFocus?.(filters);
    setSelectedCard(metricName);
  };
  const modes = [
    { value: 'P50', label: 'Median' },
    { value: 'P75', label: '75th percentile' },
    { value: 'P90', label: '90th percentile' },
    { value: 'Avg', label: 'Avg' },
    { value: 'Min', label: 'Min' },
    { value: 'Max', label: 'Max' },
  ] as const;
  const selected = metrics.find((m) => m.metricKey === selectedCard);

  return (
    <div className={`m-vitals${inGrid ? ' is-compact' : ''}`}>
      {inGrid ? null : (
        <div className="m-vitals__bar">
          {selected ? (
            <Chip
              kind="tag"
              onRemove={() => onMetricClick(null, 'good')}
              removeLabel="Clear drilldown"
            >
              {selected.description} — {searchedBy}
            </Chip>
          ) : null}
          <span className="ml-auto">
            <MenuButton<string>
              ariaLabel="Aggregation"
              icon={<Sigma />}
              value={mode}
              onChange={(v) => setMode(v as typeof mode)}
              options={modes}
              align="end"
            />
          </span>
        </div>
      )}
      <div className="m-vitals__grid">
        {metrics.map((m) => (
          <button
            key={m.name}
            type="button"
            className={`m-vitals__tile is-${m.status}${selectedCard === m.metricKey ? ' is-selected' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onMetricClick(m.metricKey as any, m.status);
            }}
            aria-label={`${m.description}: ${formatVital(m.metricKey, m.value)}, ${STATUS_LABEL[m.status]}`}
          >
            <span className="m-vitals__head">
              <span className="m-vitals__label">{m.name}</span>
              {inGrid ? null : (
                <span className="m-vitals__name m-truncate">
                  {m.description}
                </span>
              )}
            </span>
            <span className="m-vitals__value">
              {formatVital(m.metricKey, m.value)}
            </span>
            <span className="m-vitals__status">
              <i aria-hidden="true" />
              {STATUS_LABEL[m.status]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const STATUS_LABEL = {
  good: 'Good',
  medium: 'Needs improvement',
  bad: 'Poor',
} as const;

function formatVital(key: string, value: number) {
  if (!value) return 'N/A';
  if (key === 'cls') return value.toFixed(2);
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${Math.round(value)} ms`;
}

export default WebVitals;

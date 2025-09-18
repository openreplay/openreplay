import React, { useMemo } from 'react';
import {
  FUNNEL,
  HEATMAP,
  TABLE,
  TIMESERIES,
  USER_PATH,
} from 'App/constants/card';
import { Space, Select, Dropdown, Button, Input } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import ClickMapRagePicker from 'Components/Dashboard/components/ClickMapRagePicker/ClickMapRagePicker';
import { FilterKey } from 'Types/filter/filterType';
import { observer } from 'mobx-react-lite';
import {
  ChartLine,
  ChartArea,
  ChartColumn,
  ChartBar,
  ChartPie,
  Table,
  Hash,
  Users,
  Library,
  ChartColumnBig,
  ChartBarBig,
  ArrowDown01,
  SquareActivity,
  Split,
  CircleDashed,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Widget from '@/mstore/types/widget';

interface Option {
  key: string;
  label: string;
}

type MetricFormat = 'sessionCount' | 'eventCount' | 'userCount';

function WidgetOptions() {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const metric: Widget = metricStore.instance;

  const handleChange = (value: any) => {
    metric.update({ metricFormat: value });
    metric.updateKey('hasChanged', true);
  };

  const handleSortChange = (value: any) => {
    metric.update({ sortBy: value });
    metric.updateKey('hasChanged', true);
  };

  const errorSortOptions: Option[] = useMemo(
    () => [
      { key: 'time', label: t('Latest') },
      { key: 'sessions', label: t('Sessions') },
      { key: 'users', label: t('Users') },
    ],
    [],
  );

  const metricFormatLabel = ((mf: MetricFormat | undefined) => {
    switch (mf) {
      case 'sessionCount':
        return t('All Sessions');
      case 'eventCount':
        return t('Event Count');
      case 'userCount':
        return t('Unique Users');
      default:
        return t('Unique Users'); // fallback
    }
  })(metric.metricFormat as MetricFormat);

  // const hasSeriesTypes = [TIMESERIES, FUNNEL, TABLE].includes(metric.metricType);
  const hasViewTypes = [TIMESERIES, FUNNEL, USER_PATH].includes(
    metric.metricType,
  );
  return (
    <div className="flex items-center gap-2">
      {metric.metricType === USER_PATH && (
        <>
            <div className="flex space-x-8 items-center gap-2">
              <div>Steps Before</div>
                <Select
                  value={metric.stepsBefore}
                  style={{ width: 64 }}
                  onChange={(before) => {
                    let after = metric.stepsAfter;
                    if (before + after > 5) after = 5 - before;
                    metric.update({ stepsBefore: before, stepsAfter: after });
                    metric.updateKey('hasChanged', true);
                  }}
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <Select.Option key={n} value={n}>
                      {n}
                    </Select.Option>
                  ))}
                </Select>

              <div>Steps After</div>
                <Select
                  value={metric.stepsAfter}
                  style={{ width: 64 }}
                  onChange={(after) => {
                    let before = metric.stepsBefore;
                    if (before + after > 5) before = 5 - after;
                    metric.update({ stepsBefore: before, stepsAfter: after });
                    metric.updateKey('hasChanged', true);
                  }}
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <Select.Option key={n} value={n}>
                      {n}
                    </Select.Option>
                  ))}
                </Select>

                <div>Rows</div>
                <Input
                  type="number"
                  defaultValue={metric.rows}
                  className="w-16"
                  min={2}
                  max={60}
                  onChange={(rows) => {
                    metric.update({ rows: rows ?? 5 });
                    metric.updateKey('hasChanged', true);
                  }}
                />
            </div>
          {/* <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              metric.update({ hideExcess: !metric.hideExcess });
              // metric.updateKey('hasChanged', true);
            }}
          >
            <Space>
              <Switch checked={metric.hideExcess} size="small" />
              <span className="mr-4 color-gray-medium">
                {t('Group Minor Paths')}
              </span>
            </Space>
          </a> */}
        </>
      )}

      {metric.metricType === TIMESERIES && (
        <SeriesTypeOptions metric={metric} />
      )}

      {metric.metricType === TABLE && metric.metricOf === FilterKey.ERRORS && (
        <Dropdown
          trigger={['click']}
          menu={{
            selectable: true,
            items: errorSortOptions,
            onClick: (info: { key: string }) => handleSortChange(info.key),
          }}
        >
          <Button type="text" variant="text" size="small">
            <ArrowDown01 size={16} />
            {metric.sortBy
              ? errorSortOptions.find(
                  (option: Option) => option.key === metric.sortBy,
                )?.label
              : t('Sort')}
            <DownOutlined className="text-sm" />
          </Button>
        </Dropdown>
      )}

      {(metric.metricType === FUNNEL || metric.metricType === TABLE) &&
        metric.metricOf !== FilterKey.USERID &&
        metric.metricOf !== FilterKey.ERRORS && (
          <Dropdown
            trigger={['click']}
            menu={{
              selectable: true,
              items: [
                { key: 'sessionCount', label: t('All Sessions') },
                { key: 'userCount', label: t('Unique Users') },
                { key: 'eventCount', label: t('Total Events') },
              ],
              onClick: (info: { key: string }) => handleChange(info.key),
            }}
          >
            <Button type="text" variant="text" size="small">
              {metricFormatLabel}
              <DownOutlined className="text-sm" />
            </Button>
          </Dropdown>
        )}
      {hasViewTypes && <WidgetViewTypeOptions metric={metric} />}
      {metric.metricType === HEATMAP && <ClickMapRagePicker />}
    </div>
  );
}

const SeriesTypeOptions = observer(({ metric }: { metric: any }) => {
  const { t } = useTranslation();
  const items = {
    sessionCount: t('Total Sessions'),
    userCount: 'Unique Users',
    eventCount: 'Total Events',
  };
  const chartIcons = {
    sessionCount: <Library size={16} strokeWidth={1} />,
    userCount: <Users size={16} strokeWidth={1} />,
    eventCount: <SquareActivity size={16} strokeWidth={1} />,
  } as const;

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectable: true,
        items: Object.entries(items).map(([key, name]) => ({
          key,
          label: (
            <div className="flex items-center gap-2">
              {chartIcons[key]}
              <div>{name}</div>
            </div>
          ),
        })),
        onClick: ({ key }: any) => {
          metric.updateKey('metricOf', key);
          metric.updateKey('hasChanged', true);
        },
      }}
    >
      <Button
        type="text"
        variant="text"
        size="small"
        className="btn-aggregator"
      >
        <Space>
          {chartIcons[metric.metricOf]}
          <div>{items[metric.metricOf] || t('Total Sessions')}</div>
          <DownOutlined className="text-sm" />
        </Space>
      </Button>
    </Dropdown>
  );
});

const WidgetViewTypeOptions = observer(({ metric }: { metric: any }) => {
  const chartTypes = {
    lineChart: 'Line',
    areaChart: 'Stacked Area',
    barChart: 'Column',
    progressChart: 'Bar',
    columnChart: 'Horizontal Bar',
    pieChart: 'Pie',
    metric: 'Metric',
    table: 'Table',
  };
  const funnelChartTypes = {
    chart: 'Funnel Bar',
    columnChart: 'Funnel Column',
    metric: 'Metric',
    table: 'Table',
  };
  const pathTypes = {
    lineChart: 'Flow Chart',
    sunburst: 'Sunburst',
  };

  const usedChartTypes = {
    [FUNNEL]: funnelChartTypes,
    [TIMESERIES]: chartTypes,
    [USER_PATH]: pathTypes,
  };
  const chartIcons = {
    [TIMESERIES]: {
      lineChart: <ChartLine size={16} strokeWidth={1} />,
      barChart: <ChartColumn size={16} strokeWidth={1} />,
      areaChart: <ChartArea size={16} strokeWidth={1} />,
      pieChart: <ChartPie size={16} strokeWidth={1} />,
      progressChart: <ChartBar size={16} strokeWidth={1} />,
      metric: <Hash size={16} strokeWidth={1} />,
      table: <Table size={16} strokeWidth={1} />,
    },
    [FUNNEL]: {
      columnChart: <ChartColumnBig size={16} strokeWidth={1} />,
      chart: <ChartBarBig size={16} strokeWidth={1} />,
    },
    [USER_PATH]: {
      lineChart: <Split size={16} strokeWidth={1} />,
      sunburst: <CircleDashed size={16} strokeWidth={1} />,
    },
  };
  const allowedTypes = {
    [TIMESERIES]: [
      'lineChart',
      'areaChart',
      'barChart',
      'progressChart',
      'pieChart',
      'metric',
      'table',
    ],
    [FUNNEL]: ['chart', 'columnChart', 'metric', 'table'],
    [USER_PATH]: ['lineChart', 'sunburst'],
  };
  const metricType = metric.metricType;
  const viewType = metric.viewType;
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectable: true,
        items: allowedTypes[metricType].map((key) => ({
          key,
          label: (
            <div className="flex gap-2 items-center">
              {chartIcons[metricType][key]}
              <div>{usedChartTypes[metricType][key]}</div>
            </div>
          ),
        })),
        onClick: ({ key }: any) => {
          metric.updateKey('viewType', key);
          metric.updateKey('hasChanged', true);
        },
      }}
    >
      <Button
        type="text"
        variant="text"
        size="small"
        className="btn-visualization-type"
      >
        <Space>
          {chartIcons[metricType][viewType]}
          <div>{usedChartTypes[metricType][viewType]}</div>
          <DownOutlined className="text-sm " />
        </Space>
      </Button>
    </Dropdown>
  );
});

export default observer(WidgetOptions);

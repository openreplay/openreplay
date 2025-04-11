import React from 'react';
import {
  FUNNEL,
  HEATMAP,
  TABLE,
  TIMESERIES,
  USER_PATH,
} from 'App/constants/card';
import { Select, Space, Switch, Dropdown, Button } from 'antd';
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

function WidgetOptions() {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const metric: any = metricStore.instance;

  const handleChange = (value: any) => {
    metric.update({ metricFormat: value });
    metric.updateKey('hasChanged', true);
  };

  // const hasSeriesTypes = [TIMESERIES, FUNNEL, TABLE].includes(metric.metricType);
  const hasViewTypes = [TIMESERIES, FUNNEL].includes(metric.metricType);
  return (
    <div className="flex items-center gap-2">
      {metric.metricType === USER_PATH && (
        <a
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
        </a>
      )}

      {metric.metricType === TIMESERIES && (
        <SeriesTypeOptions metric={metric} />
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
              ],
              onClick: (info: { key: string }) => handleChange(info.key),
            }}
          >
            <Button type="text" variant="text" size="small">
              {metric.metricFormat === 'sessionCount'
                ? t('All Sessions')
                : t('Unique Users')}
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
  };
  const chartIcons = {
    sessionCount: <Library size={16} strokeWidth={1} />,
    userCount: <Users size={16} strokeWidth={1} />,
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
  const usedChartTypes =
    metric.metricType === FUNNEL ? funnelChartTypes : chartTypes;
  const chartIcons = {
    lineChart: <ChartLine size={16} strokeWidth={1} />,
    barChart: <ChartColumn size={16} strokeWidth={1} />,
    areaChart: <ChartArea size={16} strokeWidth={1} />,
    pieChart: <ChartPie size={16} strokeWidth={1} />,
    progressChart: <ChartBar size={16} strokeWidth={1} />,
    metric: <Hash size={16} strokeWidth={1} />,
    table: <Table size={16} strokeWidth={1} />,
    // funnel specific
    columnChart: <ChartColumnBig size={16} strokeWidth={1} />,
    chart: <ChartBarBig size={16} strokeWidth={1} />,
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
  };
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectable: true,
        items: allowedTypes[metric.metricType].map((key) => ({
          key,
          label: (
            <div className="flex gap-2 items-center">
              {chartIcons[key]}
              <div>{usedChartTypes[key]}</div>
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
          {chartIcons[metric.viewType]}
          <div>{usedChartTypes[metric.viewType]}</div>
          <DownOutlined className="text-sm " />
        </Space>
      </Button>
    </Dropdown>
  );
});

export default observer(WidgetOptions);

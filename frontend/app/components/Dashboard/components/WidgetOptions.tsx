import React from 'react';
import { FUNNEL, HEATMAP, TABLE, TIMESERIES, USER_PATH } from "App/constants/card";
import { Select, Space, Switch, Dropdown, Button} from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import ClickMapRagePicker from 'Components/Dashboard/components/ClickMapRagePicker/ClickMapRagePicker';
import { FilterKey } from 'Types/filter/filterType';
import { observer } from 'mobx-react-lite';
import { ChartLine, ChartArea, ChartColumn, ChartBar, ChartPie, Table } from 'lucide-react'

function WidgetOptions() {
  const { metricStore, dashboardStore } = useStore();
  const metric: any = metricStore.instance;

  const handleChange = (value: any) => {
    metric.update({ metricFormat: value });
  };

  const chartTypes = {
    lineChart: 'Chart',
    barChart: 'Column',
    areaChart: 'Area',
    pieChart: 'Pie',
    progressChart: 'Bar',
    table: 'Table',
  }
  const chartIcons = {
    lineChart: <ChartLine size={16} strokeWidth={1} />,
    barChart: <ChartColumn size={16} strokeWidth={1} />,
    areaChart: <ChartArea size={16} strokeWidth={1} />,
    pieChart: <ChartPie size={16} strokeWidth={1} />,
    progressChart: <ChartBar size={16} strokeWidth={1} />,
    table: <Table size={16} strokeWidth={1} />,
  }
  return (
    <div>
      {metric.metricType === USER_PATH && (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            metric.update({ hideExcess: !metric.hideExcess });
          }}
        >
          <Space>
            <Switch checked={metric.hideExcess} size="small" />
            <span className="mr-4 color-gray-medium">Hide Minor Paths</span>
          </Space>
        </a>
      )}

      {metric.metricType === TIMESERIES ? (
        <Dropdown
          menu={{
            items: Object.entries(chartTypes).map(([key, name]) => ({
              key,
              label: <div className={'flex items-center gap-2'}>
                {chartIcons[key]}
                <div>{name}</div>
              </div>,
            })),
            onClick: ({ key }: any) => {
              metric.updateKey('viewType', key);
            },
          }}
        >
          <Button>
            <Space>
              {chartIcons[metric.viewType]}
              <div>{chartTypes[metric.viewType]}</div>
              <DownOutlined />
            </Space>
          </Button>
        </Dropdown>
      ) : null}
      {(metric.metricType === FUNNEL || metric.metricType === TABLE) &&
        metric.metricOf != FilterKey.USERID &&
        metric.metricOf != FilterKey.ERRORS && (
          <Select
            defaultValue={metric.metricFormat}
            onChange={handleChange}
            variant="borderless"
            options={[
              { value: 'sessionCount', label: 'Sessions' },
              { value: 'userCount', label: 'Users' },
            ]}
          />
        )}

      {metric.metricType === HEATMAP ? <ClickMapRagePicker /> : null}
    </div>
  );
}

export default observer(WidgetOptions);

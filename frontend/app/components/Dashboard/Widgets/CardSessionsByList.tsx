import React, { useEffect } from 'react';
import { Avatar, List, Progress, Typography, Pagination } from 'antd';
import cn from 'classnames';
import { useStore } from '@/mstore';
import { observer } from 'mobx-react-lite';
import { metricService } from '@/services';

interface Props {
  list: any;
  selected?: any;
  onClickHandler?: (event: any, data: any) => void;
  metric?: any;
  total?: number;
  paginated?: boolean;
}

function CardSessionsByList({
  list,
  selected,
  paginated,
  onClickHandler = () => null,
  metric,
  total,
}: Props) {
  const { dashboardStore, metricStore, sessionStore } = useStore();
  const { drillDownPeriod } = dashboardStore;
  const params = { density: 35 };
  const metricParams = { ...params };
  const [loading, setLoading] = React.useState(false);
  const data = paginated ? metric?.data?.values : list;

  const loadData = async (page: number) => {
    const timestamps = drillDownPeriod.toTimestamps();
    const payload = { ...metricParams, ...timestamps, ...metric?.toJson() };
    const params = {
      ...drillDownPeriod,
      ...payload,
      key: metric.predefinedKey,
    };
    setLoading(true);
    const data = await metricService.getMetricChartData(
      metric,
      { ...params, page, limit: 20 },
      false,
    );
    metric.setData(data, drillDownPeriod);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <List
          dataSource={data}
          split={false}
          loading={loading}
          renderItem={(row: any, index: number) => (
            <List.Item
              key={row.name}
              onClick={(e) => onClickHandler(e, row)}
              style={{
                borderBottom: index === data.length - 1 ? 'none' : 'none',
                padding: '4px 10px',
                lineHeight: '1px',
              }}
              className={cn(
                'rounded-lg border-b-0 hover:bg-active-blue cursor-pointer',
                selected === row.name ? 'bg-active-blue' : '',
              )}
            >
              <List.Item.Meta
                className="m-0"
                avatar={<Avatar src={row.icon} />}
                title={
                  <div className="m-0">
                    <div className="flex justify-between m-0 p-0">
                      <Typography.Text ellipsis className="w-[90%]">
                        {row.displayName}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {' '}
                        {row.sessionCount}
                      </Typography.Text>
                    </div>

                    <Progress
                      percent={row.progress}
                      showInfo={false}
                      strokeColor={{
                        '0%': '#394EFF',
                        '100%': '#394EFF',
                      }}
                      size={['small', 2]}
                      style={{
                        padding: '0 0px',
                        margin: '0 0px',
                        height: 4,
                      }}
                    />
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>
      {paginated && total && total > 20 && (
        <div className="sticky bottom-0 bg-white py-2">
          <Pagination
            // showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
            defaultCurrent={metric.page}
            total={total}
            showQuickJumper
            pageSize={20}
            showSizeChanger={false}
            onChange={(page) => {
              metric.setPage(page);
              void loadData(page);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default observer(CardSessionsByList);

import React from 'react';
import ExCard from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/ExCard';
import { List, Progress } from 'antd';

interface Props {
  title: string;
  type: string;
  onCard: (card: string) => void;
  data?: any;
}

function Bars(props: Props) {
  const _data = props.data || {
    total: 90,
    values: [
      {
        label: 'company.domain.com',
        value: 89,
      },
      {
        label: 'openreplay.com',
        value: 15,
      },
    ],
  };
  return (
    <ExCard {...props}>
      <List
        itemLayout="horizontal"
        dataSource={_data.values}
        renderItem={(item: any) => (
          <List.Item>
            <List.Item.Meta
              title={
                <div className="flex justify-between w-full">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
              }
              description={
                <Progress
                  percent={Math.round((item.value * 100) / _data.total)}
                  showInfo={false}
                  strokeColor="#394EFF"
                  trailColor="#f0f0f0"
                  style={{ width: '100%' }}
                  size={['small', 2]}
                />
              }
            />
          </List.Item>
        )}
      />
    </ExCard>
  );
}

export default Bars;

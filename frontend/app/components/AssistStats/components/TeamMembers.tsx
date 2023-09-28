import { DownOutlined, TableOutlined } from '@ant-design/icons';
import { Button, Dropdown, Space, Typography } from 'antd';
import { getInitials } from 'App/utils';
import React from 'react';

const items = [
  {
    label: 'Sessions Assisted',
    key: '1',
  },
  {
    label: 'Live Duration',
    key: '2',
  },
  {
    label: 'Call Duration',
    key: '3',
  },
  {
    label: 'Remote Duration',
    key: '4',
  },
];

function TeamMembers() {
  const [dateRange, setDateRange] = React.useState(items[0].label);
  const updateRange = ({ key }: { key: string }) => {
    const item = items.find((item) => item.key === key);
    setDateRange(item?.label || items[0].label);
  };
  return (
    <div className={'rounded bg-white border p-2 h-full w-full'}>
      <div className={'flex items-center'}>
        <Typography.Title style={{ marginBottom: 0 }} level={4}>
          Team Members
        </Typography.Title>
        <div className={'ml-auto flex items-center gap-2'}>
          <Dropdown menu={{ items, onClick: updateRange }}>
            <Button size={'small'}>
              <Space>
                <Typography.Text>{dateRange}</Typography.Text>
                <DownOutlined rev={undefined} />
              </Space>
            </Button>
          </Dropdown>
          <Button shape={'default'} size={'small'} icon={<TableOutlined rev={undefined} />} />
        </div>
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={'w-full flex items-center gap-2 border-b pt-2 pb-1'}>
          <div className="relative flex items-center justify-center w-10 h-10">
            <div className="absolute left-0 right-0 top-0 bottom-0 mx-auto w-10 h-10 rounded-full opacity-30 bg-tealx" />
            <div className="text-lg uppercase color-tealx">{getInitials('Sudheer Salavadi')}</div>
          </div>
          <div>Sudheer Salavadi</div>
          <div className={'ml-auto'}>300</div>
        </div>
      ))}
      <div className={'flex items-center justify-center text-disabled-text pt-1'}>
        Showing 1 to 5 of the total 25
      </div>
    </div>
  );
}

export default TeamMembers;

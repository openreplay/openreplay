import React from 'react';
import { Button, Dropdown, Space, Typography, Input } from 'antd';
import { FilePdfOutlined, DownOutlined } from '@ant-design/icons';

const { Search } = Input;

const items = [
  {
    label: '24 Hours',
    key: '1',
  },
  {
    label: 'Past 7 days',
    key: '2',
  },
  {
    label: '14 days',
    key: '3',
  },
  {
    label: 'yuh',
    key: '4',
  },
];

function AssistStats() {
  const [dateRange, setDateRange] = React.useState(items[0].label);
  const updateRange = ({ key }: { key: string }) => {
    const item = items.find((item) => item.key === key);
    setDateRange(item?.label || items[0].label);
  };
  return (
    <div className={'w-full'}>
      <div className={'w-full flex items-center'}>
        <Typography.Title level={4}>Assist Stats</Typography.Title>
        <div className={'ml-auto flex items-center gap-2'}>
          <Search
            placeholder="input search text"
            allowClear
            size={'small'}
            classNames={{ input: '!border-0 focus:!border-0' }}
            onSearch={() => null}
            style={{ width: 200 }}
          />

          <Dropdown menu={{ items, onClick: updateRange }}>
            <Button size={'small'}>
              <Space>
                <Typography.Text>{dateRange}</Typography.Text>
                <DownOutlined rev={undefined} />
              </Space>
            </Button>
          </Dropdown>
          <Button shape={'default'} size={'small'} icon={<FilePdfOutlined rev={undefined} />} />
        </div>
      </div>
    </div>
  );
}

export default AssistStats;

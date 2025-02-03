import React, { useEffect } from 'react';
import { PageTitle } from 'UI';
import { Button, Popover, Space, Dropdown, Menu } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import AddCardSection from '../AddCardSection/AddCardSection';
import MetricsSearch from '../MetricsSearch';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { DROPDOWN_OPTIONS } from 'App/constants/card';

const options = [
  {
    key: 'all',
    label: 'All Types',
  },
  ...DROPDOWN_OPTIONS.map((option) => ({
    key: option.value,
    label: option.label,
  })),
  {
    key: 'monitors',
    label: 'Monitors',
  },
  {
    key: 'web_analytics',
    label: 'Web Analytics',
  },
];

function MetricViewHeader() {
  const { metricStore } = useStore();
  const filter = metricStore.filter;
  const cardsLength = metricStore.filteredCards.length;

  useEffect(() => {
    metricStore.updateKey('sort', { by: 'desc' });
  }, [metricStore]);

  const handleMenuClick = ({ key }: { key: string }) => {
    metricStore.updateKey('filter', { ...filter, type: key });
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      {options.map((option) => (
        <Menu.Item key={option.key}>{option.label}</Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div>
      <div className="flex items-center justify-between pr-4">
        <div className="flex items-center gap-2 ps-4">
          <PageTitle title="Cards" className="cursor-default" />
          
          {cardsLength > 0 && (
            <Space>
              <Dropdown overlay={menu} trigger={['click']}>
                <Button type="text" size="small" className="mt-1">
                  {options.find((opt) => opt.key === filter.type)?.label ||
                    'Select Type'}
                  <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          )}
        </div>
        
        {cardsLength > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <Popover
              arrow={false}
              overlayInnerStyle={{ padding: 0, borderRadius: '0.75rem' }}
              content={<AddCardSection fit inCards />}
              trigger="click"
            >
              <Button type="primary" icon={<PlusOutlined />} className="btn-create-card">
                Create Card
              </Button>
            </Popover>
            <Space>
              <MetricsSearch />
            </Space>
          </div>
        )}
      </div>
    </div>
  );
}

export default observer(MetricViewHeader);
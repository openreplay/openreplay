import React, { useEffect } from 'react';
import { PageTitle } from 'UI';
import { Button, Popover, Space, Dropdown, Menu } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import AddCardSection from '../AddCardSection/AddCardSection';
import MetricsSearch from '../MetricsSearch';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { DROPDOWN_OPTIONS } from 'App/constants/card';

function MetricViewHeader() {
  const { metricStore } = useStore();
  const filter = metricStore.filter;

  useEffect(() => {
    // Set the default sort order to 'desc'
    metricStore.updateKey('sort', { by: 'desc' });
  }, [metricStore]);
  // Handler for dropdown menu selection
  const handleMenuClick = ({ key }) => {
    metricStore.updateKey('filter', { ...filter, type: key });
  };

  // Dropdown menu options
  const menu = (
    <Menu onClick={handleMenuClick}>
      <Menu.Item key="all">All Types</Menu.Item>
      {DROPDOWN_OPTIONS.map((option) => (
        <Menu.Item key={option.value}>{option.label}</Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div>
      <div className="flex items-center justify-between  pr-4">
        <div className="flex items-center gap-2 ps-4">
          <PageTitle title="Cards" className="cursor-default" />
          <Space>
            <Dropdown overlay={menu} trigger={['click']} className="">
              <Button type="text" size="small" className="mt-1">
                {filter.type === 'all'
                  ? 'All Types'
                  : DROPDOWN_OPTIONS.find((opt) => opt.value === filter.type)
                      ?.label || 'Select Type'}
                <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Popover
            arrow={false}
            overlayInnerStyle={{ padding: 0, borderRadius: '0.75rem' }}
            content={<AddCardSection fit inCards />}
            trigger="click"
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              className="btn-create-card"
            >
              Create Card
            </Button>
          </Popover>

          <Space>
            <MetricsSearch />
          </Space>
        </div>
      </div>
    </div>
  );
}

export default observer(MetricViewHeader);

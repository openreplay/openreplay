import React, { useEffect } from 'react';
import { PageTitle } from 'UI';
import { Button, Popover, Space, Dropdown, Menu } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { DROPDOWN_OPTIONS } from 'App/constants/card';
import MetricsSearch from '../MetricsSearch';
import AddCardSection from '../AddCardSection/AddCardSection';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

const options = (t: TFunction) => [
  {
    key: 'all',
    label: t('All Types'),
  },
  ...DROPDOWN_OPTIONS(t).map((option) => ({
    key: option.value,
    label: option.label,
  })),
  {
    key: 'monitors',
    label: t('Monitors'),
  },
  {
    key: 'web_analytics',
    label: t('Web Analytics'),
  },
];

function MetricViewHeader() {
  const { t } = useTranslation();
  const { metricStore } = useStore();
  const { filter } = metricStore;
  const cardsLength = metricStore.filteredCards.length;

  // Determine if a filter is active (search query or metric type other than 'all')
  const isFilterActive =
    filter.query !== '' || (filter.type && filter.type !== 'all');
  // Show header if there are cards or if a filter is active
  const showHeader = cardsLength > 0 || isFilterActive;

  // useEffect(() => {
  //   metricStore.updateKey('sort', { by: 'desc' });
  // }, [metricStore]);

  const handleMenuClick = ({ key }: { key: string }) => {
    metricStore.updateKey('filter', { ...filter, type: key });
  };

  const menu = (
    <Menu onClick={handleMenuClick}>
      {options(t).map((option) => (
        <Menu.Item key={option.key}>{option.label}</Menu.Item>
      ))}
    </Menu>
  );

  return (
    <div>
      <div className="flex items-center justify-between pr-4">
        <div className="flex items-center gap-2 ps-4">
          <PageTitle title={t('Cards')} className="cursor-default" />

          {showHeader && (
            <Space>
              <Dropdown overlay={menu} trigger={['click']}>
                <Button type="text" size="small" className="mt-1">
                  {options(t).find((opt) => opt.key === filter.type)?.label ||
                    t('Select Type')}
                  <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          )}
        </div>

        {showHeader && (
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
                {t('Create Card')}
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

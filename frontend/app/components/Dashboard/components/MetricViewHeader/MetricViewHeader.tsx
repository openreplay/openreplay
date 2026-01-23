import React, { useEffect } from 'react';
import { PageTitle } from 'UI';
import { Button, Popover, Space, Dropdown, MenuProps } from 'antd';
import { PlusOutlined, DownOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { DROPDOWN_OPTIONS, CATEGORIES } from 'App/constants/card';
import MetricsSearch from '../MetricsSearch';
import AddCardSection from '../AddCardSection/AddCardSection';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { mobileScreen } from 'App/utils/isMobile';

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
    key: CATEGORIES.monitors,
    label: t('Monitors'),
  },
  {
    key: CATEGORIES.web_analytics,
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

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    metricStore.updateKey('filter', { ...filter, type: key });
  };

  const menuItems: MenuProps['items'] = options(t).map((option) => ({
    key: option.key,
    label: option.label,
  }));

  return (
    <div>
      <div className="flex items-center justify-between pr-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2 ps-4 w-full">
          <PageTitle title={t('Cards')} className="cursor-default" />

          <div className="flex items-center gap-2 w-full">
            {showHeader && (
              <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
                <Button type="text" size="small" className="mt-1 pl-0! md:pl-unset">
                  {options(t).find((opt) => opt.key === filter.type)?.label ||
                    t('Select Type')}
                  <DownOutlined />
                </Button>
              </Dropdown>
            )}

            {showHeader && (
              <div className="flex items-center gap-3 md:ml-auto">
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
                    {mobileScreen ? undefined : t('Create Card')}
                  </Button>
                </Popover>
                <Space>
                  <MetricsSearch />
                </Space>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default observer(MetricViewHeader);

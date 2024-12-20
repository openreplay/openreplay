import React, { useEffect } from 'react';
import { PageTitle } from 'UI';
import { Button, Popover } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import AddCardSection from '../AddCardSection/AddCardSection';
import MetricsSearch from '../MetricsSearch';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

function MetricViewHeader() {
  const { metricStore } = useStore();

  useEffect(() => {
  // Set the default sort order to 'desc'
    metricStore.updateKey('sort', { by: 'desc' });
  }, [metricStore]);

  return (
    <div>
      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex items-baseline mr-3">
          <PageTitle title="Cards" className="" />
        </div>
        <div className="ml-auto flex items-center">
          <Popover arrow={false} overlayInnerStyle={{ padding: 0, borderRadius: '0.75rem' }} content={<AddCardSection fit inCards />} trigger={'click'}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
            >
              Create Card
            </Button>
          </Popover>
          <div className="ml-4 w-1/4" style={{ minWidth: 300 }}>
            <MetricsSearch />
          </div>
        </div>
      </div>
    </div>
  );
}

export default observer(MetricViewHeader);


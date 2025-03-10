import React from 'react';
import LiveSessionSearchField from 'Shared/LiveSessionSearchField';
import { Tooltip } from 'UI';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { useTranslation } from 'react-i18next';

interface Props {
  appliedFilter: any;
}

function LiveSearchBar(props: Props) {
  const { t } = useTranslation();
  const { searchStoreLive } = useStore();
  const appliedFilter = searchStoreLive.instance;
  const hasFilters =
    appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
  return (
    <div className="flex items-center">
      <div style={{ width: '60%', marginRight: '10px' }}>
        <LiveSessionSearchField />
      </div>
      <div className="flex items-center" style={{ width: '40%' }}>
        <Tooltip title={t('Clear Steps')}>
          <Button
            type="text"
            disabled={!hasFilters}
            className="text-main ml-auto font-medium"
            onClick={() => searchStoreLive.clearSearch()}
          >
            {t('Clear')}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
export default observer(LiveSearchBar);

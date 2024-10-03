import React from 'react';
import LiveSessionSearchField from 'Shared/LiveSessionSearchField';
import { Button, Tooltip } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

interface Props {
  appliedFilter: any;
}

const LiveSearchBar = (props: Props) => {
  const { searchStoreLive } = useStore();
  const appliedFilter = searchStoreLive.instance;
  const hasFilters = appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
  return (
    <div className="flex items-center">
      <div style={{ width: '60%', marginRight: '10px' }}>
        <LiveSessionSearchField />
      </div>
      <div className="flex items-center" style={{ width: '40%' }}>
        <Tooltip title={'Clear Steps'}>
          <Button
            variant="text-primary"
            disabled={!hasFilters}
            className="ml-auto font-medium"
            onClick={() => searchStoreLive.clearSearch()}
          >
            Clear
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
export default observer(LiveSearchBar);

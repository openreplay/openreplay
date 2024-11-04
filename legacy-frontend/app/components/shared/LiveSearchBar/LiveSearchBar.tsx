import React from 'react';
import LiveSessionSearchField from 'Shared/LiveSessionSearchField';
import { Button, Tooltip } from 'UI';
import { clearSearch } from 'Duck/liveSearch';
import { connect } from 'react-redux';

interface Props {
  clearSearch: () => void;
  appliedFilter: any;
}
const LiveSearchBar = (props: Props) => {
  const { appliedFilter } = props;
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
            onClick={() => props.clearSearch()}
          >
            Clear
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
export default connect(
  (state) => ({
    appliedFilter: state.getIn(['liveSearch', 'instance']),
  }),
  { clearSearch }
)(LiveSearchBar);

import React from 'react';
import SessionSearchField from 'Shared/SessionSearchField';
import SavedSearch from 'Shared/SavedSearch';
import { Button } from 'UI';
import { connect } from 'react-redux';
import { clearSearch } from 'Duck/search';

interface Props {
  clearSearch: () => void;
  appliedFilter: any;
}
const MainSearchBar = (props: Props) => {
  const { appliedFilter } = props;
  const hasFilters = appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
  return (
    <div className="flex items-center">
      <div style={{ width: '60%', marginRight: '10px' }}>
        <SessionSearchField />
      </div>
      <div className="flex items-center" style={{ width: '40%' }}>
        <SavedSearch />
        <Button
          variant={hasFilters ? 'text-primary' : 'text'}
          className="ml-auto font-medium"
          disabled={!hasFilters}
          onClick={() => props.clearSearch()}
        >
          Clear Search
        </Button>
      </div>
    </div>
  );
};
export default connect(
  (state: any) => ({
    appliedFilter: state.getIn(['search', 'instance']),
  }),
  {
    clearSearch,
  }
)(MainSearchBar);

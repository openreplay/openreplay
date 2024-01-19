import React from 'react';
import SessionSearchField from 'Shared/SessionSearchField';
import SavedSearch from 'Shared/SavedSearch';
import { Button } from 'UI';
import { connect } from 'react-redux';
import { clearSearch } from 'Duck/search';
import TagList from './components/TagList';

interface Props {
  clearSearch: () => void;
  appliedFilter: any;
  savedSearch: any;
}

const MainSearchBar = (props: Props) => {
  const { appliedFilter } = props;
  const hasFilters = appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
  const hasSavedSearch = props.savedSearch && props.savedSearch.exists();
  const hasSearch = hasFilters || hasSavedSearch;
  return (
    <div className="flex items-center">
      <div style={{ width: '60%', marginRight: '10px' }}>
        <SessionSearchField />
      </div>
      <div className="flex items-center gap-2" style={{ width: '40%' }}>
        <TagList />
        <SavedSearch />
        <Button
          variant={hasSearch ? 'text-primary' : 'text'}
          className="ml-auto font-medium"
          disabled={!hasSearch}
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
    savedSearch: state.getIn(['search', 'savedSearch']),
  }),
  {
    clearSearch,
  }
)(MainSearchBar);

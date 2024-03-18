import React from 'react';
import SessionSearchField from 'Shared/SessionSearchField';
import AiSessionSearchField from 'Shared/SessionSearchField/AiSessionSearchField';
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

  // @ts-ignore
  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);
  return (
    <div className="flex items-center flex-wrap">
      <div style={{ flex: 3, marginRight: '10px' }}>
        {isSaas ? <AiSessionSearchField /> : <SessionSearchField />}
      </div>
      <div className="flex items-center gap-2" style={{ flex: 2 }}>
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

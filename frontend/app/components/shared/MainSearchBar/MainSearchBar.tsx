import React from 'react';
import SessionSearchField from 'Shared/SessionSearchField';
import AiSessionSearchField from 'Shared/SessionSearchField/AiSessionSearchField';
import SavedSearch from 'Shared/SavedSearch';
// import { Button } from 'UI';
import { Button } from 'antd';
import { connect } from 'react-redux';
import { clearSearch } from 'Duck/search';
import TagList from './components/TagList';

interface Props {
  clearSearch: () => void;
  appliedFilter: any;
  savedSearch: any;
  site: any;
}

const MainSearchBar = (props: Props) => {
  const { appliedFilter, site } = props;
  const currSite = React.useRef(site)
  const hasFilters = appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
  const hasSavedSearch = props.savedSearch && props.savedSearch.exists();
  const hasSearch = hasFilters || hasSavedSearch;

  // @ts-ignore
  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);

  React.useEffect(() => {
    if (site !== currSite.current && currSite.current !== undefined) {
      console.debug('clearing filters due to project change')
      props.clearSearch();
      currSite.current = site
    }
  }, [site])
  return (
    <div className="flex items-center flex-wrap">
      <div style={{ flex: 3, marginRight: '10px' }}>
        {isSaas ? <AiSessionSearchField /> : <SessionSearchField />}
      </div>
      <div className="flex items-center gap-2 my-2 xl:my-0" style={{ flex: 2 }}>
        <TagList />
        <SavedSearch />
        <Button
          // variant={hasSearch ? 'text-primary' : 'text'}
          // className="ml-auto font-medium"
          type='link'
          disabled={!hasSearch}
          onClick={() => props.clearSearch()}
          className='ml-auto font-medium'
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
    site: state.getIn(['site', 'siteId']),
  }),
  {
    clearSearch,
  }
)(MainSearchBar);

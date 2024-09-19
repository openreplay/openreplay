import React from 'react';
import SessionSearchField from 'Shared/SessionSearchField';
import AiSessionSearchField from 'Shared/SessionSearchField/AiSessionSearchField';
import SavedSearch from 'Shared/SavedSearch';
import { Button } from 'antd';
import { connect } from 'react-redux';
import TagList from './components/TagList';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';

interface Props {

}

const MainSearchBar = (props: Props) => {
  const { searchStore, projectsStore } = useStore();
  const appliedFilter = searchStore.instance;
  const savedSearch = searchStore.savedSearch;
  const projectId = projectsStore.siteId;
  const currSite = React.useRef(projectId);
  const hasFilters = appliedFilter && appliedFilter.filters && appliedFilter.filters.size > 0;
  const hasSavedSearch = savedSearch && savedSearch.exists();
  const hasSearch = hasFilters || hasSavedSearch;

  // @ts-ignore
  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);

  React.useEffect(() => {
    if (projectId !== currSite.current && currSite.current !== undefined) {
      console.debug('clearing filters due to project change');
      searchStore.clearSearch();
      currSite.current = projectId;
    }
  }, [projectId]);
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
          type="link"
          disabled={!hasSearch}
          onClick={() => searchStore.clearSearch()}
          className="ml-auto font-medium"
        >
          Clear Search
        </Button>
      </div>
    </div>
  );
};

export default observer(MainSearchBar);

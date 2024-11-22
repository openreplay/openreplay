import React from 'react';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import SaveFilterButton from 'Shared/SaveFilterButton';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import TagList from '../MainSearchBar/components/TagList';
import SavedSearch from '../SavedSearch/SavedSearch';
import { Button } from 'antd';

function SearchActions() {
  const { aiFiltersStore, searchStore, customFieldStore } = useStore();
  const appliedFilter = searchStore.instance;
  const metaLoading = customFieldStore.isLoading;
  const hasEvents =
    appliedFilter.filters.filter((i: any) => i.isEvent).length > 0;
  const hasFilters =
    appliedFilter.filters.filter((i: any) => !i.isEvent).length > 0;
  const savedSearch = searchStore.savedSearch;
  const hasSavedSearch = savedSearch && savedSearch.exists();
  const hasSearch = hasFilters || hasSavedSearch;

  const showPanel = hasEvents || hasFilters || aiFiltersStore.isLoading;
  return !metaLoading ? (
    <div className={'mb-2'}>
      <div className={'flex items-center gap-2 w-full'}>
        <TagList />
        <SavedSearch />
        <div className={'ml-auto'} />
        <Button
          type="link"
          disabled={!hasSearch}
          onClick={() => searchStore.clearSearch()}
          className="font-medium"
        >
          Clear Search
        </Button>
        <SaveFilterButton disabled={!hasEvents && !hasFilters} />
      </div>
      {showPanel ? (
        <>
          {aiFiltersStore.isLoading ? (
            <div className={'font-semibold flex items-center gap-2 p-4'}>
              <AnimatedSVG name={ICONS.LOADER} size={18} />
              <span>Translating your query into search steps...</span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  ) : null;
}

export default observer(SearchActions);

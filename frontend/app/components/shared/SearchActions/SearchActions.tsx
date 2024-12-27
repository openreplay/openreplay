import React, { useMemo } from "react";
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import SavedSearch from '../SavedSearch/SavedSearch';
import { Button } from 'antd';
import AiSessionSearchField from 'Shared/SessionFilters/AiSessionSearchField';

function SearchActions() {
  const { aiFiltersStore, searchStore, customFieldStore, userStore } = useStore();
  const appliedFilter = searchStore.instance;
  const activeTab = searchStore.activeTab;
  const isEnterprise = userStore.isEnterprise;
  const metaLoading = customFieldStore.isLoading;
  const hasEvents =
    appliedFilter.filters.filter((i: any) => i.isEvent).length > 0;
  const hasFilters =
    appliedFilter.filters.filter((i: any) => !i.isEvent).length > 0;
  const savedSearch = searchStore.savedSearch;
  const hasSavedSearch = savedSearch && savedSearch.exists();
  const hasSearch = hasFilters || hasSavedSearch;

  const title = useMemo(() => {
    if (activeTab && activeTab.type === 'bookmarks') {
      return isEnterprise ? 'Vault' : 'Bookmarks';
    }
    return 'Sessions';
  }, [activeTab?.type, isEnterprise]);

  // @ts-ignore
  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);
  const showAiField = isSaas && activeTab.type === 'sessions';
  const showPanel = hasEvents || hasFilters || aiFiltersStore.isLoading;
  return !metaLoading ? (
    <div className={'mb-2'}>
      <div className={'flex items-center gap-2 w-full'}>
        <h2 className="text-2xl capitalize mr-4">{title}</h2>
        {isSaas && showAiField ? <AiSessionSearchField /> : null}
        <div className={'ml-auto'} />
        <Button
          type="link"
          disabled={!hasSearch}
          onClick={() => searchStore.clearSearch()}
          className="font-medium"
        >
          Clear
        </Button>
        <SavedSearch />
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

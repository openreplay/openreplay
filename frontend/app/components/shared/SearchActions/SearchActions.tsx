import React, { useMemo } from 'react';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Button, Tooltip } from 'antd';
import AiSessionSearchField from 'Shared/SessionFilters/AiSessionSearchField';
import { useTranslation } from 'react-i18next';
import SavedSearch from '../SavedSearch/SavedSearch';

function SearchActions() {
  const { t, i18n } = useTranslation();
  const { aiFiltersStore, searchStore, customFieldStore, userStore } =
    useStore();
  const appliedFilter = searchStore.instance;
  const { activeTab } = searchStore;
  const { isEnterprise } = userStore;
  const metaLoading = customFieldStore.isLoading;
  const hasEvents =
    appliedFilter.filters.filter((i: any) => i.isEvent).length > 0;
  const hasFilters =
    appliedFilter.filters.filter((i: any) => !i.isEvent).length > 0;
  const { savedSearch } = searchStore;
  const hasSavedSearch = savedSearch && savedSearch.exists();
  const hasSearch = hasEvents || hasFilters || hasSavedSearch;

  const title = useMemo(() => {
    if (activeTab && activeTab.type === 'bookmarks') {
      return isEnterprise ? t('Vault') : t('Bookmarks');
    }
    return t('Sessions');
  }, [activeTab?.type, isEnterprise, i18n.language]);

  // @ts-ignore
  const originStr = window.env.ORIGIN || window.location.origin;
  const isSaas = /app\.openreplay\.com/.test(originStr);
  const showAiField = isSaas && activeTab.type === 'sessions';
  const showPanel = hasEvents || hasFilters || aiFiltersStore.isLoading;
  return !metaLoading ? (
    <div className="mb-2">
      <div className={'flex flex-col lg:hidden items-start  gap-2 w-full'}>
        <div className='flex items-center justify-between w-full'>
          <h2 className="text-2xl capitalize mr-4 inline">{title}</h2>
          <div className={'ml-auto flex gap-1'}>
            <SavedSearch/>
            <Tooltip title='Clear Search Filters'>
              <Button
                type="text"
                disabled={!hasSearch}
                onClick={() => searchStore.clearSearch()}
                className="px-2"
              >
                {t('Clear')}
              </Button>
            </Tooltip>
          </div>
        </div>
        {isSaas ? <AiSessionSearchField/> : null}
      </div>

      <div className={'hidden lg:flex items-center gap-2 w-full '}>
        <h2 className="text-2xl capitalize mr-4">{title}</h2>
        {isSaas && showAiField ? <AiSessionSearchField /> : null}
        <div className="ml-auto" />
        <SavedSearch />
        <Tooltip title={t('Clear Search Filters')}>
          <Button
            type="text"
            disabled={!hasSearch}
            onClick={() => searchStore.clearSearch()}
            className="px-2"
          >
            {t('Clear')}
          </Button>
        </Tooltip>
      </div>
      {showPanel ? (
        <>
          {aiFiltersStore.isLoading ? (
            <div className="font-semibold flex items-center gap-2 p-4">
              <AnimatedSVG name={ICONS.LOADER} size={18} />
              <span>{t('Translating your query into search steps...')}</span>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  ) : null;
}

export default observer(SearchActions);

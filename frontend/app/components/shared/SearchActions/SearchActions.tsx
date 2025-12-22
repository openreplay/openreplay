import React, { useMemo } from 'react';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { Button, Tooltip, Divider } from 'antd';
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

  const showPanel = hasEvents || hasFilters || aiFiltersStore.isLoading;
  return !metaLoading ? (
    <div className="mb-2">
      {/* mobile */}
      <div className={'flex flex-col lg:hidden items-start  gap-2 w-full'}>
        <div className="flex items-center justify-between w-full">
          <h2 className="text-2xl capitalize mr-4 inline">{title}</h2>
          <div className={'ml-auto flex items-center gap-1'}>
            <SavedSearch />
            <Divider type="vertical" className="h-6" />
            <Tooltip title="Clear Search Filters">
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
      </div>

      {/* desktop */}
      <div className={'hidden lg:flex items-center gap-2 w-full '}>
        <h2 className="text-2xl capitalize mr-4">{title}</h2>
        <div className="ml-auto" />
        <SavedSearch />
        <Divider type="vertical" className="h-6" />
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

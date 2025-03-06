import { Button, Input, Segmented } from 'antd';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useStore } from 'App/mstore';
import { debounce } from 'App/utils';
import ReloadButton from 'Shared/ReloadButton';
import { useTranslation } from 'react-i18next';

const SpotsListHeader = observer(
  ({
    onDelete,
    selectedCount,
    onClearSelection,
    tenantHasSpots,
    onRefresh,
  }: {
    onDelete: () => void;
    selectedCount: number;
    onClearSelection: () => void;
    onRefresh: () => void;
    isEmpty?: boolean;
    tenantHasSpots: boolean;
  }) => {
    const { t } = useTranslation();
    const { spotStore } = useStore();

    const debouncedFetch = React.useMemo(
      () => debounce(spotStore.fetchSpots, 250),
      [],
    );
    const onSearch = (value: string) => {
      spotStore.setQuery(value);
      void spotStore.fetchSpots();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      spotStore.setQuery(e.target.value);
      debouncedFetch();
    };

    const onFilterChange = (key: 'all' | 'own') => {
      spotStore.setFilter(key);
      void spotStore.fetchSpots();
    };

    const handleSegmentChange = (value: string) => {
      const key = value === t('All Spots') ? 'all' : 'own';
      onFilterChange(key);
    };

    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex gap-1 items-center">
          <h1 className={'text-2xl capitalize mr-2'}>{t('Spots')}</h1>
          <ReloadButton buttonSize={'small'} onClick={onRefresh} iconSize={14} />
        </div>

        {tenantHasSpots ? (
          <div className="flex gap-2 items-center">
            <div className="ml-auto">
              {selectedCount > 0 && (
                <>
                  <Button
                    type="text"
                    onClick={onClearSelection}
                    className="mr-2 px-3"
                  >
                    {t('Clear')}
                  </Button>
                  <Button onClick={onDelete} type="primary" ghost>
                    {t('Delete')} ({selectedCount})
                  </Button>
                </>
              )}
            </div>

            <Segmented
              options={[t('All Spots'), t('My Spots')]}
              value={
                spotStore.filter === 'all' ? t('All Spots') : t('My Spots')
              }
              onChange={handleSegmentChange}
              className="mr-4 lg:hidden xl:flex"
              size="small"
            />

            <div className="w-56">
              <Input.Search
                value={spotStore.query}
                allowClear
                name="spot-search"
                placeholder={t('Filter by title')}
                onChange={handleInputChange}
                onSearch={onSearch}
                className="rounded-lg"
                size="small"
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  },
);

export default SpotsListHeader;

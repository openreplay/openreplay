import React, { useEffect } from 'react';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { Button, Card } from 'antd';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

const liveFilterKeys = [
  'metadata',
  'userid',
  'usercountry',
  'usercity',
  'userstate',
  'useranonymousid',
  'userbrowser',
  'useros',
  'userdevice',
  'platform',
  'utm_medium',
  'utm_source',
  'utm_campaign',
];

function LiveSessionSearch() {
  const { projectsStore, searchStoreLive, filterStore } = useStore();
  const saveRequestPayloads = projectsStore.active?.saveRequestPayloads;
  const appliedFilter = searchStoreLive.instance;
  const allFilterOptions = filterStore.getScopedCurrentProjectFilters(['sessions']);
  const propertyOptions = allFilterOptions
    .filter((i) => !i.isEvent && i.category !== 'event')
    .filter(
      (i) =>
        liveFilterKeys.includes(i.name.toLowerCase()) ||
        i.name.startsWith('metadata'),
    );

  const activeFilters = appliedFilter.filters.map((f) => f.name);

  useEffect(() => {
    if (projectsStore.activeSiteId) {
      void searchStoreLive.fetchSessions(true);
    }
  }, [projectsStore.activeSiteId]);

  const onAddFilter = (filter: any) => {
    searchStoreLive.addFilter(filter);
  };

  const onUpdateFilter = (filterIndex: number, filter: any) => {
    searchStoreLive.updateFilter(filterIndex, filter);
  };

  const onRemoveFilter = (filterIndex: number) => {
    const newFilters = appliedFilter.filters.filter(
      (_filter, i) => i !== filterIndex,
    );

    searchStoreLive.edit({
      filters: newFilters,
    });
  };
  return (
    <Card className="rounded-lg" classNames={{ body: 'p-4!' }}>
      <FilterListHeader
        title="Filters"
        filterSelection={
          <FilterSelection
            type="Filters"
            filters={propertyOptions}
            activeFilters={activeFilters}
            onFilterClick={onAddFilter}
          >
            <Button type="default" size="small">
              <div className="flex items-center gap-1">
                <Plus size={16} strokeWidth={1} />
                <span>Add</span>
              </div>
            </Button>
          </FilterSelection>
        }
      />
      <UnifiedFilterList
        title="Filters"
        handleAdd={onAddFilter}
        handleUpdate={onUpdateFilter}
        handleRemove={onRemoveFilter}
        saveRequestPayloads={saveRequestPayloads}
        filters={appliedFilter.filters}
        isLive
        scope="sessions"
      />
    </Card>
  );
}

export default observer(LiveSessionSearch);

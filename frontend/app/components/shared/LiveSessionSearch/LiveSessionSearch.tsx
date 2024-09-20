import React, { useEffect } from 'react';
import FilterList from 'Shared/Filters/FilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { Button } from 'UI';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

function LiveSessionSearch() {
  const { projectsStore, searchStoreLive, sessionStore } = useStore();
  const saveRequestPayloads = projectsStore.active?.saveRequestPayloads;
  const appliedFilter = searchStoreLive.instance;
  const hasEvents = appliedFilter.filters.filter(i => i.isEvent).length > 0;
  const hasFilters = appliedFilter.filters.filter(i => !i.isEvent).length > 0;

  useEffect(() => {
    searchStoreLive.fetchSessions();
  }, []);

  const onAddFilter = (filter) => {
    searchStoreLive.addFilter(filter);
  };

  const onUpdateFilter = (filterIndex, filter) => {
    searchStoreLive.updateFilter(filterIndex, filter);
    sessionStore.fetchLiveSessions();
  };

  const onRemoveFilter = (filterIndex) => {
    const newFilters = appliedFilter.filters.filter((_filter, i) => {
      return i !== filterIndex;
    });

    searchStoreLive.edit({
      filters: newFilters
    });

    sessionStore.fetchLiveSessions();
  };

  const onChangeEventsOrder = (e, { name, value }) => {
    searchStoreLive.edit({
      eventsOrder: value
    });

    sessionStore.fetchLiveSessions();
  };

  return (hasEvents || hasFilters) ? (
    <div className="border bg-white rounded mt-4">
      <div className="p-5">
        <FilterList
          filter={appliedFilter}
          onUpdateFilter={onUpdateFilter}
          onRemoveFilter={onRemoveFilter}
          onChangeEventsOrder={onChangeEventsOrder}
          saveRequestPayloads={saveRequestPayloads}
        />
      </div>

      <div className="border-t px-5 py-1 flex items-center -mx-2">
        <div>
          <FilterSelection
            filter={undefined}
            onFilterClick={onAddFilter}
          >
            {/* <IconButton primaryText label="ADD STEP" icon="plus" /> */}
            <Button
              variant="text-primary"
              className="mr-2"
              // onClick={() => setshowModal(true)}
              icon="plus">
              ADD STEP
            </Button>
          </FilterSelection>
        </div>
        <div className="ml-auto flex items-center">
          {/* <SaveFunnelButton /> */}
          {/* <SaveFilterButton /> */}
        </div>
      </div>
    </div>
  ) : <></>;
}

export default observer(LiveSessionSearch);

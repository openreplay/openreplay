import React from 'react';
import FilterList from 'Shared/Filters/FilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { connect } from 'react-redux';
import { Button } from 'UI';
import { edit, addFilter } from 'Duck/liveSearch';
import useSessionSearchQueryHandler from 'App/hooks/useSessionSearchQueryHandler';

interface Props {
  appliedFilter: any;
  edit: typeof edit;
  addFilter: typeof addFilter;
  saveRequestPayloads: boolean;
  loading?: boolean;
}
function LiveSessionSearch(props: Props) {
  const { appliedFilter, saveRequestPayloads = false, loading = false } = props;
  const hasEvents = appliedFilter.filters.filter((i: any) => i.isEvent).size > 0;
  const hasFilters = appliedFilter.filters.filter((i: any) => !i.isEvent).size > 0;

  // Handle URL query parameters
  useSessionSearchQueryHandler({
    appliedFilter,
    applyFilter: props.edit,
    loading,
  });

  const onAddFilter = (filter: any) => {
    props.addFilter(filter);
  }

  const onUpdateFilter = (filterIndex: any, filter: any) => {
    const newFilters = appliedFilter.filters.map((_filter: any, i: any) => {
      if (i === filterIndex) {
        return filter;
      } else {
        return _filter;
      }
    });

    props.edit({
        ...appliedFilter,
        filters: newFilters,
    });
  }

  const onRemoveFilter = (filterIndex: any) => {
    const newFilters = appliedFilter.filters.filter((_filter: any, i: any) => {
      return i !== filterIndex;
    });

    props.edit({
      filters: newFilters,
    });
  }

  const onChangeEventsOrder = (e: any, { name, value }: any) => {
    props.edit({
      eventsOrder: value,
    });
  }

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

export default connect((state: any) => ({
  saveRequestPayloads: state.getIn(['site', 'active', 'saveRequestPayloads']),
  appliedFilter: state.getIn([ 'liveSearch', 'instance' ]),
  loading: state.getIn(['liveSearch', 'fetchSessionListRequest', 'loading']) || false,
}), { edit, addFilter })(LiveSessionSearch);
import React from 'react';
import FilterList from 'Shared/Filters/FilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { connect } from 'react-redux';
import { Button } from 'UI';
import { edit, addFilter } from 'Duck/liveSearch';

interface Props {
  appliedFilter: any;
  edit: typeof edit;
  addFilter: typeof addFilter;
  saveRequestPayloads: boolean;
}
function LiveSessionSearch(props: Props) {
  const { appliedFilter, saveRequestPayloads = false } = props;
  const hasEvents = appliedFilter.filters.filter(i => i.isEvent).size > 0;
  const hasFilters = appliedFilter.filters.filter(i => !i.isEvent).size > 0;

  const onAddFilter = (filter) => {
    props.addFilter(filter);
  }

  const onUpdateFilter = (filterIndex, filter) => {
    const newFilters = appliedFilter.filters.map((_filter, i) => {
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

  const onRemoveFilter = (filterIndex) => {
    const newFilters = appliedFilter.filters.filter((_filter, i) => {
      return i !== filterIndex;
    });

    props.edit({
      filters: newFilters,
    });
  }

  const onChangeEventsOrder = (e, { name, value }) => {
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

export default connect(state => ({
  saveRequestPayloads: state.getIn(['site', 'active', 'saveRequestPayloads']),
  appliedFilter: state.getIn([ 'liveSearch', 'instance' ]),
}), { edit, addFilter })(LiveSessionSearch);
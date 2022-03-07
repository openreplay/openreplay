import React from 'react';
import FilterList from 'Shared/Filters/FilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import { connect } from 'react-redux';
import { IconButton } from 'UI';
import { editFilter, addFilter } from 'Duck/funnels';
import UpdateFunnelButton from 'Shared/UpdateFunnelButton';

interface Props {
  appliedFilter: any;
  editFilter: typeof editFilter;
  addFilter: typeof addFilter;
}
function FunnelSearch(props: Props) {
  const { appliedFilter } = props;
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

    props.editFilter({
        ...appliedFilter,
        filters: newFilters,
    });
  }

  const onRemoveFilter = (filterIndex) => {
    const newFilters = appliedFilter.filters.filter((_filter, i) => {
      return i !== filterIndex;
    });

    props.editFilter({
      filters: newFilters,
    });
  }

  const onChangeEventsOrder = (e, { name, value }) => {
    props.editFilter({
      eventsOrder: value,
    });
  }

  return (
    <div className="border bg-white rounded mt-4">
      <div className="p-5">
        <FilterList
          filter={appliedFilter}
          onUpdateFilter={onUpdateFilter}
          onRemoveFilter={onRemoveFilter}
          onChangeEventsOrder={onChangeEventsOrder}
          hideEventsOrder={true}
        />
      </div>

      <div className="border-t px-5 py-1 flex items-center -mx-2">
        <div>
          <FilterSelection
            filter={undefined}
            onFilterClick={onAddFilter}
          >
            <IconButton primaryText label="ADD STEP" icon="plus" />
          </FilterSelection>
        </div>
        <div className="ml-auto flex items-center">
          <UpdateFunnelButton />
        </div>
      </div>
    </div>
  );
}

export default connect(state => ({
  appliedFilter: state.getIn([ 'funnels', 'instance', 'filter' ]),
}), { editFilter, addFilter })(FunnelSearch);
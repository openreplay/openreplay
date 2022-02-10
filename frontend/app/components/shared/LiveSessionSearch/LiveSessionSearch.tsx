import React from 'react';
import FilterList from 'Shared/Filters/FilterList';
import { connect } from 'react-redux';
import { edit, addFilter } from 'Duck/liveSearch';
import LiveFilterModal from 'Shared/Filters/LiveFilterModal';

interface Props {
  appliedFilter: any;
  edit: typeof edit;
  addFilter: typeof addFilter;
}
function LiveSessionSearch(props: Props) {
  const { appliedFilter } = props;
  const hasEvents = appliedFilter.filters.filter(i => i.isEvent).size > 0;
  const hasFilters = appliedFilter.filters.filter(i => !i.isEvent).size > 0;

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
        />
      </div>
    </div>
  ) : <></>;
}

export default connect(state => ({
  appliedFilter: state.getIn([ 'liveSearch', 'instance' ]),
}), { edit, addFilter })(LiveSessionSearch);
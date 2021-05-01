import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { applyFilter } from 'Duck/funnels';
import SortDropdown from './Filters/SortDropdown';
import DateRange from 'Shared/DateRange';
import { TimezoneDropdown } from 'UI';
import { numberWithCommas } from 'App/utils';

const DEFAULT_SORT = 'startTs';
const DEFAULT_ORDER = 'desc';
const sortOptionsMap = {
  'startTs-desc': 'Newest',
  'startTs-asc': 'Oldest',
  'eventsCount-asc': 'Events Ascending',
  'eventsCount-desc': 'Events Descending',
};
const sortOptions = Object.entries(sortOptionsMap)
  .map(([ value, text ]) => ({ value, text }));


function FunnelListHeader(props) {
  const { activeTab, count, applyFilter, funnelFilters } = props;

  useEffect(() => { applyFilter({ sort: DEFAULT_SORT, order: DEFAULT_ORDER }) }, [])
  
  const onDateChange = (e) => {
    applyFilter(e)
  }
  
  return (
    <div className="flex mb-6 justify-between items-end">
      <div className="flex items-baseline">
        <h3 className="text-2xl capitalize">
          <span>{ activeTab.name }</span>
          { count ? <span className="ml-2 font-normal color-gray-medium">{ numberWithCommas(count) }</span> : '' }
        </h3>
        <div className="ml-3 flex items-center">
          <span className="mr-2 color-gray-medium">Sessions Captured in</span>
          <DateRange
            rangeValue={funnelFilters.rangeValue}
            startDate={funnelFilters.startDate}
            endDate={funnelFilters.endDate}
            onDateChange={onDateChange}
          />
        </div>
      </div>
      <div className="flex items-center">
        <div className="flex items-center">
          <span className="mr-2 color-gray-medium">Timezone</span>
          <TimezoneDropdown />
        </div>
        <div className="flex items-center ml-6">
          <span className="mr-2 color-gray-medium">Sort By</span>
          <SortDropdown options={ sortOptions }/>
        </div>
      </div>
    </div>
  );
};

export default connect(state => ({
  activeTab: state.getIn([ 'sessions', 'activeTab' ]),
  funnelFilters: state.getIn([ 'funnels', 'funnelFilters']),
}), { applyFilter })(FunnelListHeader);

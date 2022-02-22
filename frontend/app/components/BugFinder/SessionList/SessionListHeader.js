import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { applyFilter } from 'Duck/filters';
import SortDropdown from '../Filters/SortDropdown';
import DateRange from '../DateRange';
import { TimezoneDropdown } from 'UI';
import { numberWithCommas } from 'App/utils';
import DropdownPlain from 'Shared/DropdownPlain';

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


function SessionListHeader({
  activeTab,
  count,
  applyFilter,
  ...props
}) {
  // useEffect(() => { applyFilter({ sort: DEFAULT_SORT, order: DEFAULT_ORDER }) }, [])
  return (
    <div className="flex mb-6 justify-between items-end">
      <div className="flex items-baseline">
        <h3 className="text-2xl capitalize">
          <span>{ activeTab.name }</span>
          <span className="ml-2 font-normal color-gray-medium">{ count ? numberWithCommas(count) : 0 }</span>
        </h3>
        <div className="ml-3 flex items-center">
          <span className="mr-2 color-gray-medium">Sessions Captured in</span>
          <DateRange />
        </div>
      </div>
      <div className="flex items-center">
        {/* <div className="flex items-center">
          <span className="mr-2 color-gray-medium">Session View</span>
          <DropdownPlain
            options={[
              { text: 'List', value: 'list' },
              { text: 'Grouped', value: 'grouped' }
            ]}
            onChange={() => {}}
            value='list'
          />
        </div> */}
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
}), { applyFilter })(SessionListHeader);

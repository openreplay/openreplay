import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import SortDropdown from '../Filters/SortDropdown';
import DateRange from '../DateRange';
import { TimezoneDropdown } from 'UI';
import { numberWithCommas } from 'App/utils';
import SelectDateRange from 'Shared/SelectDateRange';
import { setPeriod } from 'Duck/search';

const sortOptionsMap = {
  'startTs-desc': 'Newest',
  'startTs-asc': 'Oldest',
  'eventsCount-asc': 'Events Ascending',
  'eventsCount-desc': 'Events Descending',
};
const sortOptions = Object.entries(sortOptionsMap)
  .map(([ value, label ]) => ({ value, label }));


function SessionListHeader({
  activeTab,
  count,
  period,
  setPeriod,
  ...props
}) {
  return (
    <div className="flex mb-6 justify-between items-end">
      <div className="flex items-baseline">
        <h3 className="text-2xl capitalize">
          <span>{ activeTab.name }</span>
          <span className="ml-2 font-normal color-gray-medium">{ count ? numberWithCommas(count) : 0 }</span>
        </h3>
        { activeTab.type !== 'bookmark' && (
          <div className="ml-3 flex items-center">
            <span className="mr-2 color-gray-medium">Sessions Captured in</span>
            {/* <DateRange /> */}
            <SelectDateRange
                period={period}
                onChange={setPeriod}
            />
          </div>
        )}
      </div>
      <div className="flex items-center">
        <div className="flex items-center ml-6">
          <span className="mr-2 color-gray-medium">Sort By</span>
          <SortDropdown options={ sortOptions }/>
        </div>
      </div>
    </div>
  );
};

export default connect(state => ({
  activeTab: state.getIn([ 'search', 'activeTab' ]),
  period: state.getIn([ 'search', 'period' ]),
}), { setPeriod })(SessionListHeader);

import React, { useState } from 'react';
import { Icon, Dropdown, Button } from 'UI';
import { LAST_24_HOURS, LAST_30_MINUTES, LAST_7_DAYS, LAST_30_DAYS, CUSTOM_RANGE } from 'Types/app/period';
import stl from './filterItem.css';
import cn from 'classnames';
import { setPeriod } from 'Duck/dashboard';
import { connect } from 'react-redux';
import { debounce } from 'App/utils';
import DateRangeDropdown from 'Shared/DateRangeDropdown/DateRangeDropdown';
import FilterDropdown from 'Shared/FilterDropdown';

export const PERIOD_OPTIONS = [
  { text: 'Past 30 Min', value: LAST_30_MINUTES },
  { text: 'Past 24 Hours', value: LAST_24_HOURS },
  { text: 'Past 7 Days', value: LAST_7_DAYS },
  { text: 'Past 30 Days', value: LAST_30_DAYS },
  { text: 'Choose Date', value: CUSTOM_RANGE },
];

const FilterItem = props => {
  const { period, filters, compare = false, metaOptions, allowedFilters = [] } = props;  
  const filterKeyMaps = filters.map(f => f.key).toJS();  
  const [rangeName, setRangeName] = useState(period.rangeName)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const setPeriod = debounce(props.setPeriod, 500)
  
  const appliedFilters = allowedFilters.length > 0 ? 
    filters.filter(f => allowedFilters.includes(f.key) ) :
    filters;

  const onDateChange = (e) => {
    setPeriod(compare, { rangeName: e.rangeValue, start: e.startDate, end: e.endDate });
    setRangeName(e.rangeValue)
    setStartDate(e.startDate)
    setEndDate(e.endDate)
  }

  return (
    <div className={cn(stl.wrapper, 'flex items-center')}>
      <div className={cn(stl.circle, 'flex-shrink-0', { [stl.compare] : compare})} />
      <div className="flex-shrink-0">
        <DateRangeDropdown
          button
          onChange={ onDateChange }
          rangeValue={ rangeName }
          startDate={ startDate }
          endDate={ endDate }
        />
      </div>
      <div className="ml-2" />
      
      <div className="flex items-center flex-wrap">
        {appliedFilters.map(f => (
          <div className="bg-white rounded-full p-1 px-3 mr-2">
            <div className="flex items-center">
              <span className="mr-2 color-gray-darkest">{f.text || f.value}</span>
              <Icon className="cursor-pointer" size="12" name="close" onClick={() => props.removeFilter(f)} />
            </div>
          </div>
        ))}
        <FilterDropdown
          onSelect={props.onSelect}
          filterKeyMaps={filterKeyMaps}
          metaOptions={metaOptions}
          allowedFilters={allowedFilters}
        />
      </div>
      <div className="ml-auto">
        <div className="flex items-center">
          {filters.size > 0 && (
            <Button size="small" plain hover onClick={props.resetFilters}>
              <span className="cursor-pointer color-gray-dark text-sm font-medium">CLEAR</span>
            </Button>
          )}
          { compare &&
            <Button
              size="small"
              plain
              onClick={props.removeCompare}
            >
              <Icon className="ml-3 cursor-pointer" name="trash" size="14" />
            </Button>
          }
        </div>
      </div>
    </div>
  )
}

export default connect((state, props) => {
  const comparing = props && props.compare;
  return {
    period: state.getIn([ 'dashboard', comparing ? 'periodCompare' : 'period' ]),
    metaOptions: state.getIn([ 'dashboard', 'metaOptions' ])
  }
}, { setPeriod })(FilterItem)
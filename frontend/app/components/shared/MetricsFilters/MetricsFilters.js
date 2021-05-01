import React, { useState } from 'react'
import { Button, Label, Icon, Dropdown } from 'UI';
import stl from './filters.css';
import { LAST_24_HOURS, LAST_30_MINUTES, LAST_7_DAYS, LAST_30_DAYS, CUSTOM_RANGE } from 'Types/app/period';
import FilterItem from './FilterItem';
import { setComparing, setFilters, clearFilters, removeFilter } from 'Duck/dashboard';
import { connect } from 'react-redux';

export const PERIOD_OPTIONS = [
  { text: 'Past 30 Min', value: LAST_30_MINUTES },
  { text: 'Past 24 Hours', value: LAST_24_HOURS },
  { text: 'Past 7 Days', value: LAST_7_DAYS },
  { text: 'Past 30 Days', value: LAST_30_DAYS },
  { text: 'Choose Date', value: CUSTOM_RANGE },
];

const MetricsFilters = props => {
  const { rangeName, comparing, filters, filtersCompare, allowedFilters } = props;
  
  return (
    <div className="w-full">
      <FilterItem
        allowedFilters={allowedFilters}
        rangeName={rangeName}
        filters={filters}        
        onSelect={filter => props.setFilters('default', filter)}
        removeFilter={filter => props.removeFilter('default', filter.key)}
        resetFilters={() => props.clearFilters('default')}
      />
      <hr className={stl.divider} />
      {!comparing && (
        <div>
          <Button hover plain size="small" onClick={() => props.setComparing(true)} id="compare-button">
            <span className="text-sm font-medium tracking-wider">COMPARE</span>
          </Button>
        </div>
      )}
      {comparing && (
        <React.Fragment>
          <FilterItem
            compare
            rangeName={rangeName}
            filters={filtersCompare}
            // onPeriodChange={onPeriodChange}
            onSelect={filter => props.setFilters('compare', filter)}
            removeFilter={filter => props.removeFilter('compare', filter.key)}
            removeCompare={() => props.setComparing(false)}
            resetFilters={() => props.clearFilters('compare')}
            allowedFilters={allowedFilters}
          />          
        </React.Fragment>
      )}
    </div>
  )
}

export default connect(state => ({
  comparing: state.getIn([ 'dashboard', 'comparing' ]),
  filters: state.getIn([ 'dashboard', 'filters' ]),
  filtersCompare: state.getIn([ 'dashboard', 'filtersCompare' ]),
}), { setComparing, setFilters, clearFilters, removeFilter })(MetricsFilters)

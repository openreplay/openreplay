import React, { useEffect, useState } from 'react'
import { Dropdown, Loader } from 'UI'
import DateRange from 'Shared/DateRange';
import { connect } from 'react-redux';
import { fetchInsights } from 'Duck/sessions';
import SelectorsList from './components/SelectorsList/SelectorsList';
import { markTargets, Controls as Player } from 'Player';

const JUMP_OFFSET = 1000;
interface Props {
  filters: any
  fetchInsights: (filters) => void
  urls: []
  insights: any
  events: Array<any>
  urlOptions: Array<any>
  loading: boolean
}

function PageInsightsPanel({ filters, fetchInsights, events = [], insights, urlOptions, loading = true }: Props) {
  const [insightsFilters, setInsightsFilters] = useState(filters)
  
  const onDateChange = (e) => {
    setInsightsFilters({ ...insightsFilters, startDate: e.startDate, endDate: e.endDate })
  }

  useEffect(() => {     
    markTargets(insights.toJS());
    return () => {
      markTargets(null)
    }
  }, [insights])

  useEffect(() => {
    const url = insightsFilters.url ? insightsFilters.url : urlOptions[0].value
    fetchInsights({ ...insightsFilters, url })
  }, [insightsFilters])

  const onPageSelect = (e, { name, value }) => {
    const event = events.find(item => item.url === value)    
    Player.jump(event.time + JUMP_OFFSET)
    setInsightsFilters({ ...insightsFilters, url: value })
    markTargets([])
  };

  return (
    <div className="px-4 bg-gray-lightest">
      <div className="my-3 flex">
        <DateRange
          // rangeValue={filters.rangeValue}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onDateChange={onDateChange}
          customRangeRight
        />
      </div>
      <div className="mb-4 flex items-center">
        <div className="mr-2 flex-shrink-0">In Page</div>
        <Dropdown
          labeled
          placeholder="change"
          selection
          options={ urlOptions }
          name="url"
          defaultValue={urlOptions[0].value}
          onChange={ onPageSelect }
          id="change-dropdown"
          className="customDropdown"          
          style={{ minWidth: '80px', width: '100%' }}
        />
      </div>
      <Loader loading={ loading }>
        <SelectorsList />
      </Loader>            
    </div>
  )
}

export default connect(state => {
  const events = state.getIn([ 'sessions', 'visitedEvents' ])
  return {
    filters: state.getIn(['sessions', 'insightFilters']),
    insights: state.getIn([ 'sessions', 'insights' ]),
    events: events,
    urlOptions: events.map(({ url }) => ({ text: url, value: url})),
    loading: state.getIn([ 'sessions', 'fetchInsightsRequest', 'loading' ]),
  }
}, { fetchInsights })(PageInsightsPanel);
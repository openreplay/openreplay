import React, { useEffect, useState } from 'react';
import { Dropdown, Loader } from 'UI';
import DateRange from 'Shared/DateRange';
import { connect } from 'react-redux';
import { fetchInsights } from 'Duck/sessions';
import SelectorsList from './components/SelectorsList/SelectorsList';
import { markTargets, Controls as Player } from 'Player';
import Select from 'Shared/Select';
import SelectDateRange from 'Shared/SelectDateRange';
import Period from 'Types/app/period';

const JUMP_OFFSET = 1000;
interface Props {
  filters: any
  fetchInsights: (filters) => void
  urls: []
  insights: any
  events: Array<any>
  urlOptions: Array<any>
  loading: boolean
  host: string
}

function PageInsightsPanel({
  filters, fetchInsights, events = [], insights, urlOptions, host, loading = true
}: Props) {
  const [insightsFilters, setInsightsFilters] = useState(filters)
  const defaultValue = (urlOptions && urlOptions[0]) ? urlOptions[0].value : ''

  const period = new Period({
    start: insightsFilters.startDate,
    end: insightsFilters.endDate,
    rangeName: insightsFilters.rangeValue
  });

  const onDateChange = (e) => {
    const { startDate, endDate, rangeValue } = e.toJSON();
    setInsightsFilters({ ...insightsFilters, startDate, endDate, rangeValue })
  }

  useEffect(() => {
    markTargets(insights.toJS());
    return () => {
      markTargets(null)
    }
  }, [insights])

  useEffect(() => {
    if (urlOptions && urlOptions[0]) {
      const url = insightsFilters.url ? insightsFilters.url : host + urlOptions[0].value;
      Player.pause();
      fetchInsights({ ...insightsFilters, url })
    }
  }, [insightsFilters])

  const onPageSelect = (e, { name, value }) => {
    const event = events.find(item => item.url === value)
    Player.jump(event.time + JUMP_OFFSET)
    setInsightsFilters({ ...insightsFilters, url: host + value })
    markTargets([])
  };

  return (
    <div className="px-4 bg-white" style={{ width: 270 }}>
      <div className="my-3 flex -ml-2">
        {/* <DateRange
          rangeValue={insightsFilters.rangeValue}
          startDate={insightsFilters.startDate}
          endDate={insightsFilters.endDate}
          onDateChange={onDateChange}
          customHidden
        /> */}
        <SelectDateRange period={period} onChange={onDateChange} disableCustom />
      </div>
      <div className="mb-4 flex items-center">
        <div className="mr-2 flex-shrink-0">In Page</div>
        <Select
          isSearchable={true}
          right
          placeholder="change"
          options={ urlOptions }
          name="url"
          defaultValue={defaultValue}
          onChange={ onPageSelect }
          id="change-dropdown"
          className="w-full"
          style={{ width: '100%' }}
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
    host: state.getIn([ 'sessions', 'host' ]),
    insights: state.getIn([ 'sessions', 'insights' ]),
    events: events,
    urlOptions: events.map(({ url, host }: any) => ({ label: url, value: url, host })),
    loading: state.getIn([ 'sessions', 'fetchInsightsRequest', 'loading' ]),
  }
}, { fetchInsights })(PageInsightsPanel);

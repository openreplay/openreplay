import React, { useEffect } from 'react'
import { fetchNewErrorsCount } from 'Duck/errors'
import { connect } from 'react-redux'
import stl from './errorsBadge.css'
import {
  getDateRangeFromValue,
  DATE_RANGE_VALUES,
} from 'App/dateRange';

const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;
const weekRange = getDateRangeFromValue(DATE_RANGE_VALUES.LAST_7_DAYS);

function ErrorsBadge({ errorsStats = {}, fetchNewErrorsCount }) {
  useEffect(() => {
    const params = { startTimestamp: weekRange.start.unix() * 1000, endTimestamp: weekRange.end.unix() * 1000 };
    fetchNewErrorsCount(params)

    setInterval(() => {
      fetchNewErrorsCount(params);
    }, AUTOREFRESH_INTERVAL);
  }, [])
  
  return errorsStats.unresolvedAndUnviewed > 0 ? (
    <div>{<div className={stl.badge} />  }</div>
  ) : ''
}

export default connect(state => ({
  errorsStats: state.getIn([ 'errors', 'stats' ]),
}), { fetchNewErrorsCount })(ErrorsBadge)

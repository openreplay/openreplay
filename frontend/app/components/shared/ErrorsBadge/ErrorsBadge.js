import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import { DATE_RANGE_VALUES, getDateRangeFromValue } from 'App/dateRange';
import { useStore } from 'App/mstore';

import stl from './errorsBadge.module.css';

const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;
const weekRange = getDateRangeFromValue(DATE_RANGE_VALUES.LAST_7_DAYS);
let intervalId = null;

function ErrorsBadge({ projects }) {
  const { errorsStore } = useStore();
  const errorsStats = errorsStore.stats;
  useEffect(() => {
    if (projects.size === 0 || !!intervalId) return;

    const params = {
      startTimestamp: weekRange.start.ts,
      endTimestamp: weekRange.end.ts,
    };
    errorsStore.fetchNewErrorsCount(params);

    intervalId = setInterval(() => {
      errorsStore.fetchNewErrorsCount(params);
    }, AUTOREFRESH_INTERVAL);
  }, [projects]);

  return errorsStats.unresolvedAndUnviewed > 0 ? (
    <div>{<div className={stl.badge} />}</div>
  ) : (
    ''
  );
}

export default connect((state) => ({
  projects: state.getIn(['site', 'list']),
}))(observer(ErrorsBadge));

import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';

import { DATE_RANGE_VALUES, getDateRangeFromValue } from 'App/dateRange';
import { useStore } from 'App/mstore';

import stl from './errorsBadge.module.css';

const AUTOREFRESH_INTERVAL = 5 * 60 * 1000;
const weekRange = getDateRangeFromValue(DATE_RANGE_VALUES.LAST_7_DAYS);
let intervalId = null;

function ErrorsBadge() {
  const { errorsStore, projectsStore } = useStore();
  const projects = projectsStore.list;
  const errorsStats = errorsStore.stats;
  useEffect(() => {
    if (projects.size === 0 || !!intervalId) return;

    const params = {
      startTimestamp: weekRange.start.ts,
      endTimestamp: weekRange.end.ts,
    };
    void errorsStore.fetchNewErrorsCount(params);

    intervalId = setInterval(() => {
      void errorsStore.fetchNewErrorsCount(params);
    }, AUTOREFRESH_INTERVAL);
  }, [projects]);

  return errorsStats.unresolvedAndUnviewed > 0 ? (
    <div>
      <div className={stl.badge} />
    </div>
  ) : null;
}

export default observer(ErrorsBadge);

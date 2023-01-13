import { NoContent } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import InsightItem from './InsightItem';
import { NO_METRIC_DATA } from 'App/constants/messages';

interface Props {}
function InsightsCard(props: Props) {
  const { metricStore, dashboardStore } = useStore();
  const metric = metricStore.instance;
  const drillDownFilter = dashboardStore.drillDownFilter;
  const period = dashboardStore.period;

  const clickHanddler = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log(e);
    // TODO update drillDownFilter
    // const periodTimestamps = period.toTimestamps();
    // drillDownFilter.merge({
    //   filters: event,
    //   startTimestamp: periodTimestamps.startTimestamp,
    //   endTimestamp: periodTimestamps.endTimestamp,
    // });
  };

  return (
    <NoContent
      show={metric.data.issues && metric.data.issues.length === 0}
      title={NO_METRIC_DATA}
      style={{ padding: '100px 0' }}
    >
      <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
        {metric.data.issues &&
          metric.data.issues.map((item: any) => (
            <InsightItem item={item} onClick={clickHanddler} />
          ))}
      </div>
    </NoContent>
  );
}

export default observer(InsightsCard);

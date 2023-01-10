import { NoContent } from 'App/components/ui';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import InsightItem from './InsightItem';

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
    <NoContent>
      {metric.data.issues.map((item: any) => (
        <InsightItem item={item} onClick={clickHanddler} />
      ))}
    </NoContent>
  );
}

export default observer(InsightsCard);

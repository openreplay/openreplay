import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import InsightItem from './InsightItem';

const data = [
  { icon: 'dizzy', ratio: 'Click Rage', increase: 10, iconColor: 'red' },
  { icon: 'dizzy', ratio: 'Click Rage', increase: 10, iconColor: 'yello' },
  { icon: 'dizzy', ratio: 'Click Rage', increase: 10, iconColor: 'green' },
  { icon: 'dizzy', ratio: 'Click Rage', increase: 10, iconColor: 'gray' },
  { icon: 'dizzy', ratio: 'Click Rage', increase: 10, iconColor: 'red' },
];
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
    <div>
      {data.map((item) => (
        <InsightItem item={item} onClick={clickHanddler} />
      ))}
    </div>
  );
}

export default observer(InsightsCard);

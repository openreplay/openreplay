import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import MetricsList from '../MetricsList';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import MetricViewHeader from '../MetricViewHeader';

interface Props {
  siteId: string;
}
function MetricsView({ siteId }: Props) {
  const { metricStore } = useStore();

  React.useEffect(() => {
    metricStore.fetchList();
  }, []);

  return useObserver(() => (
    <div style={{ maxWidth: '1300px', margin: 'auto' }} className="bg-white rounded py-4 border">
      <MetricViewHeader />
      <MetricsList siteId={siteId} />
    </div>
  ));
}

export default withPageTitle('Cards - OpenReplay')(MetricsView);

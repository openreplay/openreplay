import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import MetricsList from '../MetricsList';
import { observer } from 'mobx-react-lite';
import MetricViewHeader from '../MetricViewHeader';

interface Props {
  siteId: string;
}
function MetricsView({ siteId }: Props) {
  return (
    <div style={{ maxWidth: '1360px', margin: 'auto' }} className="bg-white rounded-lg shadow-sm pt-4 border">
      <MetricViewHeader siteId={siteId} />
      <MetricsList siteId={siteId} />
    </div>
  );
}

export default withPageTitle('Cards - OpenReplay')(observer(MetricsView));

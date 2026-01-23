import React from 'react';
import withPageTitle from 'HOCs/withPageTitle';
import { observer } from 'mobx-react-lite';
import MetricsList from '../MetricsList';
import MetricViewHeader from '../MetricViewHeader';
import { PANEL_SIZES } from 'App/constants/panelSizes'

interface Props {
  siteId: string;
}
function MetricsView({ siteId }: Props) {
  return (
    <div
      style={{ maxWidth: PANEL_SIZES.maxWidth, margin: 'auto' }}
      className="bg-white rounded-lg shadow-xs pt-4 border"
    >
      <MetricViewHeader siteId={siteId} />
      <div className="pt-3">
        <MetricsList siteId={siteId} />
      </div>
    </div>
  );
}

export default withPageTitle('Cards - OpenReplay')(observer(MetricsView));

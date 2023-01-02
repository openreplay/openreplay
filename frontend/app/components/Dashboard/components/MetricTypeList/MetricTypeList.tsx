import { useModal } from 'App/components/Modal';
import React from 'react';
import MetricsLibraryModal from '../MetricsLibraryModal';
import MetricTypeItem, { MetricType } from '../MetricTypeItem/MetricTypeItem';
import { TYPES, LIBRARY } from 'App/constants/card';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { dashboardMetricCreate, metricCreate, withSiteId } from 'App/routes';
import { useStore } from 'App/mstore';

interface Props extends RouteComponentProps {
  dashboardId: number;
  siteId: string;
}
function MetricTypeList(props: Props) {
  const { dashboardId, siteId, history } = props;
  const { metricStore } = useStore();
  const { hideModal } = useModal();

  const { showModal } = useModal();
  const onClick = ({ slug }: MetricType) => {
    hideModal();
    if (slug === LIBRARY) {
      return showModal(<MetricsLibraryModal siteId={siteId} dashboardId={dashboardId} />, { right: true, width: 800, onClose: () => {
        metricStore.updateKey('metricsSearch', '')
      } });
    }

    // TODO redirect to card builder with metricType query param
    const path = withSiteId(dashboardMetricCreate(dashboardId + ''), siteId);
    const queryString = new URLSearchParams({ type: slug }).toString();
    history.push({
      pathname: path,
      search: `?${queryString}`
    });
  };

  return (
    <>
      {TYPES.map((metric: MetricType) => (
        <MetricTypeItem metric={metric} onClick={() => onClick(metric)} />
      ))}
    </>
  );
}

export default withRouter(MetricTypeList);

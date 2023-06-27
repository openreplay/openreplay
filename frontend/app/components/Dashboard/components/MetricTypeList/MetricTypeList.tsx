import { useModal } from 'App/components/Modal';
import React from 'react';
import MetricsLibraryModal from '../MetricsLibraryModal';
import MetricTypeItem, { MetricType } from '../MetricTypeItem/MetricTypeItem';
import { TYPES, LIBRARY, INSIGHTS } from 'App/constants/card';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { dashboardMetricCreate, metricCreate, withSiteId } from 'App/routes';
import { useStore } from 'App/mstore';
import { connect } from 'react-redux';
import { ENTERPRISE_REQUEIRED } from 'App/constants';

interface Props extends RouteComponentProps {
  dashboardId?: number;
  siteId: string;
  isEnterprise: boolean;
}

function MetricTypeList(props: Props) {
  const { dashboardId, siteId, history, isEnterprise } = props;
  const { metricStore } = useStore();
  const { showModal, hideModal } = useModal();

  const list = React.useMemo(() => {
    return TYPES.map((metric: MetricType) => {
      const disabled = metric.slug === INSIGHTS && !isEnterprise;
      return {
        ...metric,
        disabled: metric.slug === INSIGHTS && !isEnterprise,
        tooltipTitle: disabled ? ENTERPRISE_REQUEIRED : ''
      };
    });
  }, []);

  if (!dashboardId) {
    list.shift();
  }

  const onClick = ({ slug }: MetricType) => {
    hideModal();
    if (slug === LIBRARY) {
      return showModal(<MetricsLibraryModal siteId={siteId} dashboardId={dashboardId} />, {
        right: true,
        width: 800,
        onClose: () => {
          metricStore.updateKey('metricsSearch', '');
        }
      });
    }

    const path = dashboardId ? withSiteId(dashboardMetricCreate(dashboardId + ''), siteId) :
      withSiteId(metricCreate(), siteId);
    const queryString = new URLSearchParams({ type: slug }).toString();
    history.push({
      pathname: path,
      search: `?${queryString}`
    });
  };

  return (
    <>
      {list.map((metric: MetricType) => (
        <MetricTypeItem metric={metric} onClick={() => onClick(metric)} />
      ))}
    </>
  );
}

export default connect((state: any) => ({
  isEnterprise: state.getIn(['user', 'account', 'edition']) === 'ee'
}))(withRouter(MetricTypeList));

import { useModal } from 'App/components/Modal';
import React from 'react';
import { TYPES, LIBRARY, INSIGHTS } from 'App/constants/card';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { dashboardMetricCreate, metricCreate, withSiteId } from 'App/routes';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { ENTERPRISE_REQUEIRED } from 'App/constants';
import MetricTypeItem, { MetricType } from '../MetricTypeItem/MetricTypeItem';
import MetricsLibraryModal from '../MetricsLibraryModal';
import { useTranslation } from 'react-i18next';

interface Props extends RouteComponentProps {
  dashboardId?: number;
  siteId: string;
  isList?: boolean;
}

function MetricTypeList(props: Props) {
  const { t } = useTranslation();
  const { dashboardId, siteId, history, isList = false } = props;
  const { metricStore, userStore } = useStore();
  const { showModal, hideModal } = useModal();
  const { isEnterprise } = userStore;

  const list = React.useMemo(
    () =>
      TYPES.map((metric: MetricType) => {
        const disabled = metric.slug === INSIGHTS && !isEnterprise;
        return {
          ...metric,
          icon: `db-icons/icn-card-${metric.slug}`,
          disabled: metric.slug === INSIGHTS && !isEnterprise,
          tooltipTitle: disabled ? ENTERPRISE_REQUEIRED(t) : '',
        };
      }),
    [],
  );

  if (!dashboardId) {
    list.shift();
  }

  const onClick = ({ slug }: MetricType) => {
    hideModal();
    if (slug === LIBRARY) {
      return showModal(
        <MetricsLibraryModal siteId={siteId} dashboardId={dashboardId} />,
        {
          right: true,
          width: 800,
          onClose: () => {
            metricStore.updateKey('metricsSearch', '');
          },
        },
      );
    }

    const path = dashboardId
      ? withSiteId(dashboardMetricCreate(`${dashboardId}`), siteId)
      : withSiteId(metricCreate(), siteId);
    const queryString = new URLSearchParams({ type: slug }).toString();
    history.push({
      pathname: path,
      search: `?${queryString}`,
    });
  };

  return (
    <>
      {list.map((metric: MetricType) => (
        <MetricTypeItem
          metric={metric}
          onClick={() => onClick(metric)}
          isList={isList}
        />
      ))}
    </>
  );
}

export default withRouter(observer(MetricTypeList));

import { useModal } from 'App/components/Modal';
import React from 'react';
import MetricsLibraryModal from '../MetricsLibraryModal';
import MetricTypeItem, { MetricType } from '../MetricTypeItem/MetricTypeItem';
import { TYPES, LIBRARY, INSIGHTS } from 'App/constants/card';
import { dashboardMetricCreate, metricCreate, withSiteId } from 'App/routes';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { ENTERPRISE_REQUEIRED } from 'App/constants';
import { useNavigate } from "react-router";

interface Props {
  dashboardId?: number;
  isList?: boolean;
}

function MetricTypeList(props: Props) {
  const navigate = useNavigate();
  const { dashboardId, isList = false } = props;
  const { metricStore, userStore, projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const { showModal, hideModal } = useModal();
  const isEnterprise = userStore.isEnterprise;

  const list = React.useMemo(() => {
    return TYPES.map((metric: MetricType) => {
      const disabled = metric.slug === INSIGHTS && !isEnterprise;
      return {
        ...metric,
        icon: `db-icons/icn-card-${metric.slug}`,
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

    const path = dashboardId
                 ? withSiteId(dashboardMetricCreate(dashboardId + ''), siteId)
                 : withSiteId(metricCreate(), siteId);
    const queryString = new URLSearchParams({ type: slug }).toString();
    navigate(path + `?${queryString}`);
  };

  return (
    <>
      {list.map((metric: MetricType) => (
        <MetricTypeItem metric={metric} onClick={() => onClick(metric)} isList={isList} />
      ))}
    </>
  );
}

export default observer(MetricTypeList);

import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import Breadcrumb from 'App/components/shared/Breadcrumb';
import { useStore } from 'App/mstore';
import { withSiteId } from 'App/routes';
import { Loader } from 'UI';

import FunnelIssueDetails from '../Funnels/FunnelIssueDetails';

interface Props {
  history: any;
  match: any;
  siteId: any;
}
function WidgetSubDetailsView(props: Props) {
  const { t } = useTranslation();
  const {
    match: {
      params: { siteId, dashboardId, metricId, subId },
    },
  } = props;
  const { metricStore, funnelStore } = useStore();
  const widget = metricStore.instance;
  const issueInstance = funnelStore.issueInstance;
  const loadingWidget = metricStore.isLoading;
  // const isFunnel = widget.metricType === 'funnel'; // TODO uncomment this line
  const isFunnel = widget.metricType === 'table'; // TODO remove this line

  useEffect(() => {
    if (!widget || !widget.exists()) {
      metricStore.fetch(metricId);
    }
  }, []);

  return (
    <div>
      <Breadcrumb
        items={[
          {
            label: dashboardId ? t('Dashboard') : t('Cards'),
            to: dashboardId
              ? withSiteId(`/dashboard/${dashboardId}`, siteId)
              : withSiteId('/metrics', siteId),
          },
          {
            label: widget.name,
            to: withSiteId(`/metrics/${widget.metricId}`, siteId),
          },
          { label: issueInstance ? issueInstance.title : 'Sub Details' },
        ]}
      />

      <Loader loading={loadingWidget}>
        {isFunnel && <FunnelIssueDetails funnelId={metricId} issueId={subId} />}
      </Loader>
    </div>
  );
}

export default observer(WidgetSubDetailsView);

import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { PageCard } from '@/ui/layout/PageCard';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

import FunnelIssueDetails from '../Funnels/FunnelIssueDetails';

interface Props {
  match: any;
  siteId: any;
}

/** One funnel issue of a card, at /metrics/:metricId/details/:subId. */
function WidgetSubDetailsView(props: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const {
    match: {
      params: { siteId, dashboardId, metricId, subId },
    },
  } = props;
  const { metricStore, funnelStore } = useStore();
  const widget = metricStore.instance;
  const issueInstance = funnelStore.issueInstance;
  // const isFunnel = widget.metricType === 'funnel'; // TODO uncomment this line
  const isFunnel = widget.metricType === 'table'; // TODO remove this line

  useEffect(() => {
    if (!widget || !widget.exists()) {
      metricStore.fetch(metricId);
    }
  }, []);

  return (
    <PageCard
      back={{
        label: widget.name || (dashboardId ? t('Dashboard') : t('Cards')),
        onClick: () =>
          history.push(
            widget.metricId
              ? withSiteId(`/metrics/${widget.metricId}`, siteId)
              : dashboardId
                ? withSiteId(`/dashboard/${dashboardId}`, siteId)
                : withSiteId('/metrics', siteId),
          ),
      }}
      title={issueInstance ? issueInstance.title : t('Issue')}
    >
      {metricStore.isLoading ? (
        <div className="px-6 py-5">
          <SkeletonRows rows={6} />
        </div>
      ) : isFunnel ? (
        <FunnelIssueDetails issueId={subId} />
      ) : null}
    </PageCard>
  );
}

export default observer(WidgetSubDetailsView);

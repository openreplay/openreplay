import { FilterKey } from 'Types/filter/filterType';
import { Space } from 'antd';
import { useObserver } from 'mobx-react-lite';
import React, { useState } from 'react';
import { Prompt, useHistory } from 'react-router';

import {
  CLICKMAP,
  FUNNEL,
  INSIGHTS,
  RETENTION,
  TABLE,
  TIMESERIES,
  USER_PATH,
} from 'App/constants/card';
import { useStore } from 'App/mstore';
import Widget from 'App/mstore/types/widget';
import { dashboardMetricDetails, metricDetails, withSiteId } from 'App/routes';
import WidgetFormNew from 'Components/Dashboard/components/WidgetForm/WidgetFormNew';
import { renderClickmapThumbnail } from 'Components/Dashboard/components/WidgetForm/renderMap';
import WidgetViewHeader from 'Components/Dashboard/components/WidgetView/WidgetViewHeader';
import { Icon, Loader, NoContent } from 'UI';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import Breadcrumb from 'Shared/Breadcrumb';

import CardIssues from '../CardIssues';
import CardUserList from '../CardUserList/CardUserList';
import FunnelIssues from '../Funnels/FunnelIssues/FunnelIssues';
import WidgetPreview from '../WidgetPreview';
import WidgetSessions from '../WidgetSessions';

interface Props {
  history: any;
  match: any;
  siteId: any;
}

function WidgetView(props: Props) {
  const {
    match: {
      params: { siteId, dashboardId, metricId },
    },
  } = props;
  // const siteId = location.pathname.split('/')[1];
  // const dashboardId = location.pathname.split('/')[3];
  const { metricStore, dashboardStore } = useStore();
  const widget = useObserver(() => metricStore.instance);
  const loading = useObserver(() => metricStore.isLoading);
  const [expanded, setExpanded] = useState(!metricId || metricId === 'create');
  const hasChanged = useObserver(() => widget.hasChanged);
  const dashboards = useObserver(() => dashboardStore.dashboards);
  const dashboard = useObserver(() =>
    dashboards.find((d: any) => d.dashboardId == dashboardId)
  );
  const dashboardName = dashboard ? dashboard.name : null;
  const [metricNotFound, setMetricNotFound] = useState(false);
  const history = useHistory();
  const [initialInstance, setInitialInstance] = useState();
  const isClickMap = widget.metricType === CLICKMAP;

  React.useEffect(() => {
    if (metricId && metricId !== 'create') {
      metricStore.fetch(metricId, dashboardStore.period).catch((e) => {
        if (e.response.status === 404 || e.response.status === 422) {
          setMetricNotFound(true);
        }
      });
    } else {
      metricStore.init();
    }
  }, []);

  // const onBackHandler = () => {
  //     props.history.goBack();
  // };
  //
  // const openEdit = () => {
  //     if (expanded) return;
  //     setExpanded(true);
  // };

  const undoChanges = () => {
    const w = new Widget();
    metricStore.merge(w.fromJson(initialInstance), false);
  };

  const onSave = async () => {
    const wasCreating = !widget.exists();
    if (isClickMap) {
      try {
        widget.sessionId = widget.data.sessionId;
        widget.thumbnail = await renderClickmapThumbnail();
      } catch (e) {
        console.error(e);
      }
    }
    const savedMetric = await metricStore.save(widget);
    setInitialInstance(widget.toJson());
    if (wasCreating) {
      if (parseInt(dashboardId, 10) > 0) {
        history.replace(
          withSiteId(
            dashboardMetricDetails(dashboardId, savedMetric.metricId),
            siteId
          )
        );
        void dashboardStore.addWidgetToDashboard(
          dashboardStore.getDashboard(parseInt(dashboardId, 10))!,
          [savedMetric.metricId]
        );
      } else {
        history.replace(
          withSiteId(metricDetails(savedMetric.metricId), siteId)
        );
      }
    }
  };

  return useObserver(() => (
    <Loader loading={loading}>
      <Prompt
        when={hasChanged}
        message={(location: any) => {
          if (
            location.pathname.includes('/metrics/') ||
            location.pathname.includes('/metric/')
          ) {
            return true;
          }
          return 'You have unsaved changes. Are you sure you want to leave?';
        }}
      />

      <div style={{ maxWidth: '1360px', margin: 'auto' }}>
        <Breadcrumb
          items={[
            {
              label: dashboardName ? dashboardName : 'Cards',
              to: dashboardId
                ? withSiteId('/dashboard/' + dashboardId, siteId)
                : withSiteId('/metrics', siteId),
            },
            { label: widget.name },
          ]}
        />
        <NoContent
          show={metricNotFound}
          title={
            <div className="flex flex-col items-center justify-between">
              <AnimatedSVG name={ICONS.EMPTY_STATE} size={100} />
              <div className="mt-4">Metric not found!</div>
            </div>
          }
        >
          <Space direction="vertical" size={20} className="w-full">
            <WidgetViewHeader onSave={onSave} undoChanges={undoChanges} />

            <WidgetFormNew />

            <WidgetPreview name={widget.name} isEditing={expanded} />

            {widget.metricOf !== FilterKey.SESSIONS &&
              widget.metricOf !== FilterKey.ERRORS && (
                <>
                  {(widget.metricType === TABLE ||
                    widget.metricType === TIMESERIES ||
                    widget.metricType === CLICKMAP ||
                    widget.metricType === INSIGHTS) && <WidgetSessions />}
                  {widget.metricType === FUNNEL && <FunnelIssues />}
                </>
              )}

            {widget.metricType === USER_PATH && <CardIssues />}
            {widget.metricType === RETENTION && <CardUserList />}
          </Space>
        </NoContent>
      </div>
    </Loader>
  ));
}

export default WidgetView;

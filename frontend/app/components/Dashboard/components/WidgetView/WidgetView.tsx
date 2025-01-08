import React, { useState } from 'react';
import { useStore } from 'App/mstore';
import { Loader, NoContent } from 'UI';
import WidgetPreview from '../WidgetPreview';
import WidgetSessions from '../WidgetSessions';
import { observer } from 'mobx-react-lite';
import { dashboardMetricDetails, metricDetails, withSiteId } from 'App/routes';
import Breadcrumb from 'Shared/Breadcrumb';
import { FilterKey } from 'Types/filter/filterType';
import { Prompt, useHistory } from 'react-router';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import {
  TIMESERIES,
  TABLE,
  HEATMAP,
  FUNNEL,
  INSIGHTS,
  USER_PATH,
  RETENTION,
} from 'App/constants/card';
import CardUserList from '../CardUserList/CardUserList';
import WidgetViewHeader from 'Components/Dashboard/components/WidgetView/WidgetViewHeader';
import WidgetFormNew from 'Components/Dashboard/components/WidgetForm/WidgetFormNew';
import { Space, Segmented, Tooltip } from 'antd';
import { renderClickmapThumbnail } from 'Components/Dashboard/components/WidgetForm/renderMap';
import Widget from 'App/mstore/types/widget';
import { LayoutPanelTop, LayoutPanelLeft } from 'lucide-react';
import cn from 'classnames'

interface Props {
  history: any;
  match: any;
  siteId: any;
}

const LAYOUT_KEY = '$__layout__$'

function getDefaultState() {
  const layout = localStorage.getItem(LAYOUT_KEY)
  return layout || 'flex-row'
}

function WidgetView(props: Props) {
  const [layout, setLayout] = useState(getDefaultState);
  const {
    match: {
      params: { siteId, dashboardId, metricId },
    },
  } = props;
  const { metricStore, dashboardStore, settingsStore } = useStore();
  const widget = metricStore.instance;
  const loading = metricStore.isLoading;
  const [expanded, setExpanded] = useState(!metricId || metricId === 'create');
  const hasChanged = widget.hasChanged;
  const dashboards = dashboardStore.dashboards;
  const dashboard = dashboards.find((d: any) => d.dashboardId == dashboardId);
  const dashboardName = dashboard ? dashboard.name : null;
  const [metricNotFound, setMetricNotFound] = useState(false);
  const history = useHistory();
  const [initialInstance, setInitialInstance] = useState();
  const isClickMap = widget.metricType === HEATMAP;

  React.useEffect(() => {
    if (metricId && metricId !== 'create') {
      metricStore.fetch(metricId, dashboardStore.period).catch((e) => {
        if (e.response.status === 404 || e.response.status === 422) {
          setMetricNotFound(true);
        }
      });
    } else {
      if (!metricStore.instance) {
        metricStore.init();
      }
    }
    const wasCollapsed = settingsStore.menuCollapsed;
    settingsStore.updateMenuCollapsed(true)
    return () => {
      if (!wasCollapsed) {
        settingsStore.updateMenuCollapsed(false)
      }
    }
  }, []);

  const undoChanges = () => {
    const w = new Widget();
    metricStore.merge(w.fromJson(initialInstance), false);
  };

  const onSave = async () => {
    const wasCreating = !widget.exists();
    if (isClickMap) {
      try {
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

  const updateLayout = (layout: string) => {
    localStorage.setItem(LAYOUT_KEY, layout)
    setLayout(layout)
  }

  return (
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
              <AnimatedSVG name={ICONS.EMPTY_STATE} size={60} />
              <div className="mt-4">Metric not found!</div>
            </div>
          }
        >
          <Space direction="vertical" className="w-full" size={14}>
          <WidgetViewHeader 
              onSave={onSave} 
              undoChanges={undoChanges}
              layoutControl={
                <Segmented
                  size='small'
                  value={layout}
                  onChange={updateLayout}
                  options={[
                    {
                      value: 'flex-row',
                      icon: (
                        <Tooltip title="Horizontal Layout">
                          <LayoutPanelLeft size={16} />
                        </Tooltip>
                      )
                    },
                    {
                      value: 'flex-col',
                      icon: (
                        <Tooltip title="Vertical Layout">
                          <LayoutPanelTop size={16} />
                        </Tooltip>
                      )
                    },
                    {
                      value: 'flex-row-reverse',
                      icon: (
                        <Tooltip title="Reversed Horizontal Layout">
                          <div className={'rotate-180'}><LayoutPanelLeft size={16} /></div>
                        </Tooltip>
                      )
                    }
                  ]}
                />
              }
            />
            <div className={cn('flex gap-4', layout)}>
              <div className={layout.startsWith('flex-row') ? 'w-1/3 ' : 'w-full'}>
                <WidgetFormNew />
              </div>
              <div className={layout.startsWith('flex-row') ? 'w-2/3' : 'w-full'}>
                <WidgetPreview name={widget.name} isEditing={expanded} />

                    {widget.metricOf !== FilterKey.SESSIONS &&
                    widget.metricOf !== FilterKey.ERRORS &&
                    (widget.metricType === TABLE ||
                    widget.metricType === TIMESERIES ||
                    widget.metricType === HEATMAP ||
                    widget.metricType === INSIGHTS ||
                    widget.metricType === FUNNEL ||
                    widget.metricType === USER_PATH ? (
                      <WidgetSessions />
                    ) : null)}
                  {widget.metricType === RETENTION && <CardUserList />}
              </div>
            </div>

            
          </Space>
        </NoContent>
      </div>
    </Loader>
  );
}

export default observer(WidgetView);

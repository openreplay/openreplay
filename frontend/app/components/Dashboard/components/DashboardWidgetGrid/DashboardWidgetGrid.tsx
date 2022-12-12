import React from 'react';
import { toJS } from 'mobx';
import { useStore } from 'App/mstore';
import WidgetWrapper from '../WidgetWrapper';
import { NoContent, Loader, Icon } from 'UI';
import { useObserver } from 'mobx-react-lite';
import AddMetricContainer from './AddMetricContainer';
import Widget from 'App/mstore/types/widget';

interface Props {
  siteId: string;
  dashboardId: string;
  onEditHandler: () => void;
  id?: string;
}
function DashboardWidgetGrid(props: Props) {
  const { dashboardId, siteId } = props;
  const { dashboardStore } = useStore();
  const loading = useObserver(() => dashboardStore.isLoading);
  const dashboard = dashboardStore.selectedDashboard;
  const list = useObserver(() => dashboard?.widgets);
  const smallWidgets: Widget[] = [];
  const regularWidgets: Widget[] = [];

  list.forEach((item) => {
    if (item.config.col === 1) {
      smallWidgets.push(item);
    } else {
      regularWidgets.push(item);
    }
  });

  const smallWidgetsLen = smallWidgets.length;

  return useObserver(() => (
    // @ts-ignore
    <Loader loading={loading}>
      <NoContent
        show={list.length === 0}
        icon="no-metrics-chart"
        title={<EmptyDashboardGrid />}
        // subtext={
        //   <div className="w-4/5 m-auto mt-4">
        //     <AddMetricContainer siteId={siteId} />
        //   </div>
        // }
      >
        <div className="grid gap-4 grid-cols-4 items-start pb-10" id={props.id}>{smallWidgets.length > 0 ? (
          <>
            <div className="font-semibold text-xl py-4 flex items-center gap-2col-span-4">
              <Icon name="grid-horizontal" size={26} />
              Web Vitals
            </div>

              {smallWidgets &&
                smallWidgets.map((item: any, index: any) => (
                  <React.Fragment key={item.widgetId}>
                    <WidgetWrapper
                      index={index}
                      widget={item}
                      moveListItem={(dragIndex: any, hoverIndex: any) =>
                        dashboard.swapWidgetPosition(dragIndex, hoverIndex)

                      }dashboardId={dashboardId}
                      siteId={siteId}
                      isWidget={true}
                      grid="vitals"
                    />
                  </React.Fragment>
                ))}

          </>
        ) : null}

        {smallWidgets.length > 0 && regularWidgets.length > 0 ? (
          <div className="font-semibold text-xl py-4 flex items-center gap-2col-span-4">
            <Icon name="grid-horizontal" size={26} />
            All Metrics
          </div>
        ) : null}

          {regularWidgets &&
            regularWidgets.map((item: any, index: any) => (
              <React.Fragment key={item.widgetId}>
                <WidgetWrapper
                  index={smallWidgetsLen + index}
                  widget={item}
                  moveListItem={(dragIndex: any, hoverIndex: any) =>
                    dashboard.swapWidgetPosition(dragIndex, hoverIndex)
                  }
                  dashboardId={dashboardId}
                  siteId={siteId}
                  isWidget={true}
                  grid="other"
                />
              </React.Fragment>
            ))}
          <div className="col-span-2"id="no-print">
            <AddMetricContainer siteId={siteId} />
          </div>
        </div>
      </NoContent>
    </Loader>
  ));
}

export default DashboardWidgetGrid;

interface MetricType {
  title: string;
  icon: string;
  description: string;
  slug: string;
}
const METRIC_TYPES: MetricType[] = [
  {
    title: 'Add From Library',
    icon: 'grid',
    description: 'Select a pre existing card from card library',
    slug: 'library',
  },
  {
    title: 'Timeseries',
    icon: 'graph-up',
    description: 'Trend of sessions count in over the time.',
    slug: 'timeseries',
  },
  {
    title: 'Table',
    icon: 'list-alt',
    description: 'See list of Users, Sessions, Errors, Issues, etc.,',
    slug: 'table'
  },
  {
    title: 'Funnel',
    icon: 'funnel',
    description: 'Uncover the issues impacting user journeys.',
    slug: 'funnel'
  },
  {
    title: 'Errors Tracking',
    icon: 'exclamation-circle',
    description: 'Discover user journeys between 2 points.',
    slug: 'errors'
  },
  {
    title: 'Performance Monitoring',
    icon: 'speedometer2',
    description: 'Retention graph of users / features over a period of time.',
    slug: 'performance'
  },
  {
    title: 'Resource Monitoring',
    icon: 'files',
    description: 'Find the adoption of your all features in your app.',
    slug: 'resource-monitoring'
  },
  {
    title: 'Web Vitals',
    icon: 'activity',
    description: 'Find the adoption of your all features in your app.',
    slug: 'web-vitals'
  },
  {
    title: 'User Path',
    icon: 'signpost-split',
    description: 'Discover user journeys between 2 points.',
    slug: 'user-path'
  },
  {
    title: 'Retention',
    icon: 'arrow-repeat',
    description: 'Retension graph of users / features over a period of time.',
    slug: 'retention'
  },
  {
    title: 'Feature Adoption',
    icon: 'card-checklist',
    description: 'Find the adoption of your all features in your app.',
    slug: 'feature-adoption'
  },
];

function MetricTypeItem({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start hover:bg-active-blue p-4 cursor-pointer">
      <div className="pr-4 pt-1">
        <Icon name={icon} size="20" />
      </div>
      <div className="flex flex-col items-start text-left">
        <div className="text-base color-gray-darkest">{title}</div>
        <div className="text-xs">{description}</div>
      </div>
    </div>
  );
}

function EmptyDashboardGrid() {
  return (
    <div className="bg-white rounded">
      <div className="border-b p-4">
        <div className="text-lg font-medium color-gray-darkest">
          There are no cards in this dashboard
        </div>
        <div className="text-sm">Try the most commonly used metrics or graphs to begin.</div>
      </div>
      <div className="grid grid-cols-4 p-8 gap-2">
        {METRIC_TYPES.map((metric: MetricType) => (
          <MetricTypeItem
            icon={metric.icon}
            title={metric.title}
            description={metric.description}
          />
        ))}
      </div>
    </div>
  );
}

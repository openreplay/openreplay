import React from 'react';
import { useStore } from 'App/mstore';
import WidgetWrapper from '../WidgetWrapper';
import { NoContent, Loader, Icon } from 'UI';
import { useObserver } from 'mobx-react-lite';
import Widget from 'App/mstore/types/widget';
import MetricTypeList from '../MetricTypeList';

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
        title={
          <div className="bg-white rounded">
            <div className="border-b p-5">
              <div className="text-2xl font-normal">
                There are no cards in this dashboard
              </div>
              <div className="text-base font-normal">
                Create a card from any of the below types or pick an existing one from your library.
              </div>
            </div>
            <div className="grid grid-cols-4 p-8 gap-2">
              <MetricTypeList dashboardId={parseInt(dashboardId)} siteId={siteId} />
            </div>
          </div>
        }
      >
        <div className="grid gap-4 grid-cols-4 items-start pb-10" id={props.id}>{smallWidgets.length > 0 ? (
          <>
            <div className="font-semibold text-xl py-4 flex items-center gap-2 col-span-4">
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
          <div className="font-semibold text-xl py-4 flex items-center gap-2 col-span-4">
            <Icon name="grid-horizontal" size={26} />
            All Cards
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
        </div>
      </NoContent>
    </Loader>
  ));
}

export default DashboardWidgetGrid;

import React from 'react';
import { useStore } from 'App/mstore';
import WidgetWrapper from '../WidgetWrapper';
import { NoContent, Loader, Icon } from 'UI';
import { useObserver } from 'mobx-react-lite';
import Widget from 'App/mstore/types/widget';
import MetricTypeList from '../MetricTypeList';
import WidgetWrapperNew from 'Components/Dashboard/components/WidgetWrapper/WidgetWrapperNew';
import { Empty } from 'antd';

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

  return useObserver(() => (
    // @ts-ignore
    list?.length === 0 ? <Empty description="No cards in this dashboard" /> : (
      <Loader loading={loading}>
        <NoContent
          show={list?.length === 0}
          icon="no-metrics-chart"
          title={
            <div className="bg-white rounded-lg">
              <div className="border-b p-5">
                <div className="text-2xl font-normal">
                  There are no cards in this dashboard
                </div>
                <div className="text-base font-normal">
                  Create a card from any of the below types or pick an existing one from your library.
                </div>
              </div>
            </div>
          }
        >
          <div className="grid gap-4 grid-cols-4 items-start pb-10" id={props.id}>
            {
              list?.map((item: any, index: any) => (
                <React.Fragment key={item.widgetId}>
                  <WidgetWrapperNew
                    index={index}
                    widget={item}
                    moveListItem={(dragIndex: any, hoverIndex: any) =>
                      dashboard?.swapWidgetPosition(dragIndex, hoverIndex)
                    }
                    dashboardId={dashboardId}
                    siteId={siteId}
                    isWidget={true}
                    grid="other"
                  />
                </React.Fragment>
              ))
            }
          </div>
        </NoContent>
      </Loader>
    )
  ));
}

export default DashboardWidgetGrid;

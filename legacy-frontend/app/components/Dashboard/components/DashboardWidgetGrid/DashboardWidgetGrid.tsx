import React from 'react';
import { useStore } from 'App/mstore';
import WidgetWrapperNew from 'Components/Dashboard/components/WidgetWrapper/WidgetWrapperNew';
import { Empty } from 'antd';
import { NoContent, Loader } from 'UI';
import { useObserver } from 'mobx-react-lite';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

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
    <Loader loading={loading}>
      {
        list?.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-5">
            <NoContent
              show={true}
              icon="no-metrics-chart"
              title={
                <div className="text-center">
                   <div className='mb-4'>
                   <AnimatedSVG name={ICONS.NO_RESULTS} size={60} />
                   </div>
                  <div className="text-xl font-medium mb-2">
                    There are no cards in this dashboard
                  </div>
                  <div className="text-base font-normal">
                  Create a card by clicking the "Add Card" button to visualize insights here.
                  </div>
                </div>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-4 items-start pb-10" id={props.id}>
            {list?.map((item: any, index: any) => (
              <React.Fragment key={item.widgetId}>
                <WidgetWrapperNew
                  index={index}
                  widget={item}
                  moveListItem={(dragIndex: any, hoverIndex: any) =>
                    dashboard?.swapWidgetPosition(dragIndex, hoverIndex)
                  }
                  dashboardId={dashboardId}
                  siteId={siteId}
                  grid="other"
                  showMenu={true}
                  isSaved={true}
                />
              </React.Fragment>
            ))}
          </div>
        )
      }
    </Loader>
  ));
}

export default DashboardWidgetGrid;

import React from 'react';
import { useStore } from 'App/mstore';
import WidgetWrapperNew from 'Components/Dashboard/components/WidgetWrapper/WidgetWrapperNew';
import { Loader } from 'UI';
import { observer } from 'mobx-react-lite';
import AddCardSection from "../AddCardSection/AddCardSection";

interface Props {
  siteId: string;
  dashboardId: string;
  onEditHandler: () => void;
  id?: string;
}

function DashboardWidgetGrid(props: Props) {
  const { dashboardId, siteId } = props;
  const { dashboardStore } = useStore();
  const loading = dashboardStore.isLoading;
  const dashboard = dashboardStore.selectedDashboard;
  const list = dashboard?.widgets;

  return (
    <Loader loading={loading}>
      {
        list?.length === 0 ? (
          <div className={'flex-1 flex justify-center items-center'}>
            <AddCardSection />
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
  );
}

export default observer(DashboardWidgetGrid);

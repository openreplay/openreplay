import React from 'react';
import { useStore } from 'App/mstore';
import WidgetWrapperNew from 'Components/Dashboard/components/WidgetWrapper/WidgetWrapperNew';
import { observer } from 'mobx-react-lite';
import AddCardSection from '../AddCardSection/AddCardSection';
import cn from 'classnames';
import { Button, Popover } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

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
      {list?.length === 0 ? (
        <div
          className={'flex-1 flex justify-center items-center pt-10'}
          style={{ minHeight: 620 }}
        >
          <AddCardSection />
        </div>
      ) : (
        <div
          className="pb-10 px-4 pt-2 grid gap-2 rounded grid-cols-4 items-start "
          id={props.id}
        >
          {list?.map((item: any, index: any) => (
            <div
              key={item.widgetId}
              className={cn('col-span-' + item.config.col, 'group relative px-6 py-2 hover:bg-active-blue w-full')}
            >
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
              <div
                className={cn(
                  'invisible group-hover:visible ',
                  'absolute -left-2 top-1/2 -translate-y-1/2',
                )}
              >
                <Popover arrow={false} overlayInnerStyle={{ padding: 0, borderRadius: '0.75rem' }} content={<AddCardSection fit inCards />} trigger={'click'}>
                  <Button icon={<PlusOutlined size={14} />} shape={'circle'} size={'small'} />
                </Popover>
              </div>
            </div>
          ))}
        </div>
      )}
    </Loader>
  );
}

export default observer(DashboardWidgetGrid);

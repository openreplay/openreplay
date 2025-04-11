import React from 'react';
import { useStore } from 'App/mstore';
import WidgetWrapperNew from 'Components/Dashboard/components/WidgetWrapper/WidgetWrapperNew';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import { Button, Popover, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Loader } from 'UI';
import AddCardSection from '../AddCardSection/AddCardSection';
import { useTranslation } from 'react-i18next';

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
          className="flex-1 flex justify-center items-center pt-10"
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
            <GridItem
              key={item.widgetId}
              item={item}
              index={index}
              dashboard={dashboard}
              dashboardId={dashboardId}
              siteId={siteId}
            />
          ))}
        </div>
      )}
    </Loader>
  );
}

function GridItem({ item, index, dashboard, dashboardId, siteId }: any) {
  const { t } = useTranslation();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const handleOpenChange = (open: boolean) => {
    setPopoverOpen(open);
  };

  return (
    <div
      key={item.widgetId}
      className={cn(
        `col-span-${item.config.col}`,
        'group relative p-2 hover:bg-active-blue w-full rounded-xl',
      )}
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
        showMenu
        isSaved
      />
      <div
        className={cn(
          'invisible group-hover:visible hidden',
          'absolute -left-2 top-1/2 -translate-y-1/2',
        )}
      >
        <Popover
          open={popoverOpen}
          onOpenChange={handleOpenChange}
          arrow={false}
          overlayInnerStyle={{ padding: 0, borderRadius: '0.75rem' }}
          content={<AddCardSection handleOpenChange={handleOpenChange} />}
          trigger="click"
        >
          <Tooltip title={t('Add Card')}>
            <Button
              icon={<PlusOutlined size={14} />}
              shape="circle"
              size="small"
            />
          </Tooltip>
        </Popover>
      </div>
    </div>
  );
}

export default observer(DashboardWidgetGrid);

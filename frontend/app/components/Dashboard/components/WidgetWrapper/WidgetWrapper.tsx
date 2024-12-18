import React, { useRef, lazy } from 'react';
import cn from 'classnames';
import { ItemMenu, TextEllipsis } from 'UI';
import { useDrag, useDrop } from 'react-dnd';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { withSiteId, dashboardMetricDetails } from 'App/routes';
import TemplateOverlay from './TemplateOverlay';
import AlertButton from './AlertButton';
import stl from './widgetWrapper.module.css';
import { FilterKey } from 'App/types/filter/filterType';
import { TIMESERIES } from "App/constants/card";

const WidgetChart = lazy(() => import('Components/Dashboard/components/WidgetChart'));

interface Props {
  className?: string;
  widget?: any;
  index?: number;
  moveListItem?: any;
  isPreview?: boolean;
  isTemplate?: boolean;
  dashboardId?: string;
  siteId?: string;
  active?: boolean;
  history?: any;
  onClick?: () => void;
  isSaved?: boolean;
  hideName?: boolean;
  grid?: string;
  isGridView?: boolean;
}
function WidgetWrapper(props: Props & RouteComponentProps) {
  const { dashboardStore } = useStore();
  const {
    isSaved = false,
    active = false,
    index = 0,
    moveListItem = null,
    isPreview = false,
    isTemplate = false,
    siteId,
    grid = '',
    isGridView = false,
  } = props;
  const widget: any = props.widget;
  const isTimeSeries = widget.metricType === TIMESERIES;
  const isPredefined = widget.metricType === 'predefined';
  const dashboard = dashboardStore.selectedDashboard;

  const [{ isDragging }, dragRef] = useDrag({
    type: 'item',
    item: { index, grid },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      opacity: monitor.isDragging() ? 0.5 : 1,
    }),
  });

  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: 'item',
    drop: (item: any) => {
      if (item.index === index || item.grid !== grid) return;
      moveListItem(item.index, index);
    },
    canDrop(item) {
      return item.grid === grid;
    },
    collect: (monitor: any) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const onDelete = async () => {
    dashboardStore.deleteDashboardWidget(dashboard?.dashboardId!, widget.widgetId);
  };

  const onChartClick = () => {
    if (!isSaved || isPredefined) return;

    props.history.push(
      withSiteId(dashboardMetricDetails(dashboard?.dashboardId, widget.metricId), siteId)
    );
  };

  const ref: any = useRef(null);
  const dragDropRef: any = dragRef(dropRef(ref));
  const addOverlay =
    isTemplate ||
    (!isPredefined &&
     isSaved &&
      widget.metricOf !== FilterKey.ERRORS &&
      widget.metricOf !== FilterKey.SESSIONS);

  return (
    <div
      className={cn(
        'relative rounded bg-white border group rounded-lg',
        'col-span-' + widget.config.col,
        { 'hover:shadow-border-gray': !isTemplate && isSaved },
        { 'hover:shadow-border-main': isTemplate }
      )}
      style={{
        userSelect: 'none',
        opacity: isDragging ? 0.5 : 1,
        borderColor:
          (canDrop && isOver) || active ? '#394EFF' : isPreview ? 'transparent' : '#EEEEEE',
      }}
      ref={dragDropRef}
      onClick={props.onClick ? props.onClick : () => {}}
      id={`widget-${widget.widgetId}`}
    >
      {!isTemplate && isSaved && isPredefined && (
        <div
          className={cn(
            stl.drillDownMessage,
            'disabled text-gray text-sm invisible group-hover:visible'
          )}
        >
          {'Cannot drill down system provided metrics'}
        </div>
      )}

      {addOverlay && <TemplateOverlay onClick={onChartClick} isTemplate={isTemplate} />}
      <div
        className={cn('p-3 pb-4 flex items-center justify-between', {
          'cursor-move': !isTemplate && isSaved,
        })}
      >
        {!props.hideName ? (
          <div className="capitalize-first w-full font-medium">
            <TextEllipsis text={widget.name} />
          </div>
        ) : null}
        {isSaved && (
          <div className="flex items-center" id="no-print">
            {!isPredefined && isTimeSeries && !isGridView && (
              <>
                <AlertButton seriesId={widget.series[0] && widget.series[0].seriesId} />
                <div className="mx-2" />
              </>
            )}

            {!isTemplate && !isGridView && (
              <ItemMenu
                items={[
                  {
                    text:
                      widget.metricType === 'predefined'
                        ? 'Cannot edit system generated metrics'
                        : 'Edit',
                    onClick: onChartClick,
                    disabled: widget.metricType === 'predefined',
                  },
                  {
                    text: 'Hide',
                    onClick: onDelete,
                  },
                ]}
              />
            )}
          </div>
        )}
      </div>

        <div className="px-4" onClick={onChartClick}>
          <WidgetChart
            isPreview={isPreview}
            metric={widget}
            isTemplate={isTemplate}
            isSaved={isSaved}
          />
        </div>
    </div>
  );
}

export default withRouter(observer(WidgetWrapper));

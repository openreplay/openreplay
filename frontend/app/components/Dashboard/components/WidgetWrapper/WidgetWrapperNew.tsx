import { IconButton } from '@/ui/actions/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Loader } from '@/ui/feedback/Loader';
import { toast } from '@/ui/overlays/toast';
import {
  Bell,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Pencil,
  X,
} from 'lucide-react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { Suspense, lazy, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import { TIMESERIES, USER_PATH } from 'App/constants/card';
import { useStore } from 'App/mstore';
import { dashboardMetricDetails, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { dashboardService } from 'App/services';
import AlertFormModal from 'Components/Alerts/AlertFormModal/AlertFormModal';
import { useModal } from 'Components/ModalContext';

import { cardTypeLabel } from '../../cardIcons';

const WidgetChart = lazy(
  () => import('Components/Dashboard/components/WidgetChart'),
);

interface Props {
  widget: any;
  index: number;
  moveListItem: (from: number, to: number) => void;
  siteId: string;
  grid?: string;
}

/** One card on a dashboard: title, type, menu, and the chart as the drilldown. */
function WidgetWrapperDashboard({
  widget,
  index,
  moveListItem,
  siteId,
  grid = 'other',
}: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const { dashboardStore, metricStore, alertsStore } = useStore();
  const { openModal, closeModal } = useModal();
  const dashboard = dashboardStore.selectedDashboard;
  const isPredefined = widget.metricType === 'predefined';
  const seriesId = widget.series[0]?.seriesId;
  const canAlert =
    !isPredefined && widget.metricType === TIMESERIES && !!seriesId;
  const full = widget.config.col === 4;

  const [{ isDragging }, dragRef] = useDrag({
    type: 'item',
    item: { index, grid },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: 'item',
    drop: (item: any) => {
      if (item.index === index || item.grid !== grid) return;
      moveListItem(item.index, index);
    },
    canDrop: (item: any) => item.grid === grid,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  const ref = useRef<HTMLElement>(null);
  dragRef(dropRef(ref));

  const open = () => {
    if (isPredefined || !dashboard) return;
    dashboardStore.setDrillDownPeriod(dashboardStore.period);
    history.push(
      withSiteId(
        dashboardMetricDetails(dashboard.dashboardId, widget.metricId),
        siteId,
      ),
    );
  };

  const createAlert = () => {
    metricStore.init(widget);
    alertsStore.init({ query: { left: seriesId } } as any);
    openModal(<AlertFormModal onClose={closeModal} />, {
      placement: 'right',
      width: 620,
    });
  };

  const setWidth = (col: number) => {
    if (!dashboard) return;
    const before = widget.config.col;
    runInAction(() => {
      widget.config.col = col;
    });
    dashboardService.saveWidget(dashboard.dashboardId!, widget).catch(() => {
      // back to what the server has, unless a later resize already replaced it
      runInAction(() => {
        if (widget.config.col === col) widget.config.col = before;
      });
      toast.error(t('Could not resize the card'));
    });
  };

  return (
    <section
      ref={ref}
      id={`widget-${widget.metricId}`}
      className={`m-dash__widget m-dash__widget--c${widget.config.col ?? 4}${isDragging ? ' is-dragging' : ''}${canDrop && isOver ? ' is-drop' : ''}`}
      style={widget.metricType === USER_PATH ? { minHeight: 600 } : undefined}
    >
      <header className="m-dash__widget-head">
        <button
          type="button"
          className="m-dash__widget-title m-truncate"
          onClick={open}
        >
          {widget.name}
        </button>
        <span className="m-dash__widget-type">
          {cardTypeLabel(t, widget.metricType, widget.metricOf)}
        </span>
        <span id="no-print" className="flex items-center">
          {canAlert ? (
            <IconButton
              icon={<Bell size={14} />}
              label={t('Create alert')}
              variant="ghost"
              onClick={createAlert}
            />
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span>
                <IconButton
                  icon={<MoreHorizontal size={14} />}
                  label={t('Actions for {{name}}', { name: widget.name })}
                  variant="ghost"
                />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItems
                items={[
                  {
                    key: 'edit',
                    icon: <Pencil size={13} />,
                    label: t('Edit'),
                    onClick: open,
                  },
                  full
                    ? {
                        key: 'half',
                        icon: <Minimize2 size={13} />,
                        label: t('Half width'),
                        onClick: () => setWidth(2),
                      }
                    : {
                        key: 'full',
                        icon: <Maximize2 size={13} />,
                        label: t('Full width'),
                        onClick: () => setWidth(4),
                      },
                  { key: 'd1', type: 'divider' },
                  {
                    key: 'remove',
                    icon: <X size={13} />,
                    label: t('Remove from dashboard'),
                    danger: true,
                    onClick: () =>
                      dashboard &&
                      void dashboardStore.deleteDashboardWidget(
                        dashboard.dashboardId!,
                        widget.widgetId,
                      ),
                  },
                ]}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </header>
      <div
        role="button"
        tabIndex={0}
        className={`m-dash__widget-body${isPredefined ? ' is-static' : ''}`}
        // the body opens the card, but not when a control inside it was used
        onClick={(e) => {
          const hit = (e.target as HTMLElement).closest(
            'button, a, input, select, textarea, [role="menuitem"], [role="checkbox"]',
          );
          if (!hit || hit === e.currentTarget) open();
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') open();
        }}
        aria-label={t('Open {{name}}', { name: widget.name })}
      >
        <Suspense fallback={<Loader loading style={{ height: 240 }} />}>
          <WidgetChart metric={widget} isSaved />
        </Suspense>
      </div>
    </section>
  );
}

export default observer(WidgetWrapperDashboard);

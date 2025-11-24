import React, { useState, useEffect } from 'react';
import { useStore } from 'App/mstore';
import { Loader } from 'UI';
import { observer } from 'mobx-react-lite';
import { dashboardMetricDetails, metricDetails, withSiteId } from 'App/routes';
import Breadcrumb from 'Shared/Breadcrumb';
import { FilterKey } from 'Types/filter/filterType';
import { Prompt, useHistory, useLocation } from 'react-router';
import {
  TIMESERIES,
  TABLE,
  HEATMAP,
  FUNNEL,
  INSIGHTS,
  USER_PATH,
  RETENTION,
  WEBVITALS,
} from 'App/constants/card';
import WidgetViewHeader from 'Components/Dashboard/components/WidgetView/WidgetViewHeader';
import WidgetFormNew from 'Components/Dashboard/components/WidgetForm/WidgetFormNew';
import { Space, Segmented, Tooltip } from 'antd';
import { renderClickmapThumbnail } from 'Components/Dashboard/components/WidgetForm/renderMap';
import Widget from 'App/mstore/types/widget';
import { LayoutPanelTop, LayoutPanelLeft } from 'lucide-react';
import cn from 'classnames';
import {
  CARD_LIST,
  CardType,
} from 'Components/Dashboard/components/DashboardList/NewDashModal/ExampleCards';
import FilterSeries from '@/mstore/types/filterSeries';
import CardUserList from '../CardUserList/CardUserList';
import WidgetSessions from '../WidgetSessions';
import WidgetPreview from '../WidgetPreview';
import { useTranslation } from 'react-i18next';
import { PANEL_SIZES } from 'App/constants/panelSizes';
import FilterItem from '@/mstore/types/filterItem';
import { mobileScreen } from 'App/utils/isMobile';

interface Props {
  history: any;
  match: any;
  siteId: any;
}

const LAYOUT_KEY = '$__metric_form__layout__$';

function getDefaultState() {
  if (mobileScreen) return 'flex-col';
  return localStorage.getItem(LAYOUT_KEY) || 'flex-row';
}

function WidgetView({
  match: {
    params: { siteId, dashboardId, metricId },
  },
}: Props) {
  const { t } = useTranslation();
  const [layout, setLayout] = useState(getDefaultState);
  const { metricStore, dashboardStore, settingsStore, filterStore } =
    useStore();
  const widget = metricStore.instance;
  const loading = metricStore.isLoading;
  const [expanded] = useState(!metricId || metricId === 'create');
  const { hasChanged } = widget;
  const dashboard = dashboardStore.dashboards.find(
    (d: any) => d.dashboardId == dashboardId,
  );
  const dashboardName = dashboard ? dashboard.name : null;
  const [metricNotFound, setMetricNotFound] = useState(false);
  const history = useHistory();
  const location = useLocation();
  const [initialInstance, setInitialInstance] = useState();
  const isClickMap = widget.metricType === HEATMAP;

  useEffect(() => {
    const sync = async () => {
      if (!metricId || metricId === 'create') {
        const params = new URLSearchParams(location.search);
        const mk = params.get('mk');
        if (!mk) return;
        const selectedCard = CARD_LIST(t).find((c) => c.key === mk) as CardType;
        if (!selectedCard) return;

        const cardData: any = {
          metricType: selectedCard.cardType,
          name: selectedCard.title,
          metricOf: selectedCard.metricOf,
          category: mk,
          sortBy: selectedCard.sortBy,
          sortOrder: selectedCard.sortOrder,
          viewType: selectedCard.viewType
            ? selectedCard.viewType
            : selectedCard.cardType === FUNNEL
              ? 'chart'
              : 'lineChart',
        };

        if (selectedCard.filters) {
          const filters = selectedCard.filters.map(async (filter) => {
            const f = filterStore.findEvent({
              name: filter.name,
              autoCaptured: filter.autoCaptured,
            });
            if (filter.filters?.length) {
              f.filters = filter.filters;
            } else if (f.isEvent) {
              const props = await filterStore.getEventFilters(f.id);
              const defaults = props?.filter((p) => p.defaultProperty) || [];
              if (selectedCard.cardType === WEBVITALS) {
                defaults[0].operator = 'isAny';
              }
              f.filters = defaults;
            }
            return f;
          });
          cardData.series = [
            new FilterSeries().fromJson({
              name: 'Series 1',
              filter: { filters },
            }),
          ];
        } else if (
          selectedCard.cardType === TABLE &&
          !widget.series[0]?.filter.filters.length
        ) {
          cardData.series = [new FilterSeries()];
          cardData.series[0].filter.eventsOrder = 'and';
        }

        if (selectedCard.cardType === FUNNEL) {
          cardData.series = [new FilterSeries()];
          cardData.series[0].filter.addFunnelDefaultFilters();
          cardData.series[0].filter.eventsOrder = 'then';
          cardData.series[0].filter.eventsOrderSupport = ['then'];
        }

        if (selectedCard.cardType === USER_PATH) {
          const startPoint = filterStore.findEvent({
            name: FilterKey.LOCATION,
            autoCaptured: true,
          });

          if (!startPoint) {
            console.error('Start point not found');
            return;
          }

          filterStore.getEventFilters(startPoint.id).then((props) => {
            const defaultProperty = props
              ?.filter((prop) => prop.defaultProperty)
              .map((prop) => {
                const nestedFilter = new FilterItem(prop);
                nestedFilter.id = prop.id;
                return nestedFilter;
              });

            startPoint.filters = defaultProperty;
          });

          cardData.startPoint = startPoint;
        }

        if (selectedCard.cardType === HEATMAP) {
          cardData.series = [new FilterSeries()];
          cardData.series[0].maxEvents = 1;
          cardData.series[0].filter.addHeatmapDefaultFilters();
        }

        if (selectedCard.cardType === WEBVITALS) {
          cardData.series = [new FilterSeries()];
          cardData.series[0].maxEvents = 1;
          cardData.series[0].filter.addWebvitalsDefaultFilters();
        }

        metricStore.merge(cardData);
      }
    };
    sync();
  }, [metricId, location.search, metricStore]);

  useEffect(() => {
    if (metricId && metricId !== 'create') {
      metricStore.fetch(metricId, dashboardStore.period).catch((e) => {
        if (e.response.status === 404 || e.response.status === 422) {
          setMetricNotFound(true);
        }
      });
    } else if (!metricStore.instance) {
      metricStore.init();
    }
    const wasCollapsed = settingsStore.menuCollapsed;
    settingsStore.updateMenuCollapsed(true);
    return () => {
      if (!wasCollapsed) settingsStore.updateMenuCollapsed(false);
    };
  }, [metricId, metricStore, dashboardStore.period, settingsStore]);

  useEffect(() => {
    if (metricNotFound) {
      history.replace(withSiteId('/metrics', siteId));
    }
  }, [metricNotFound, history, siteId]);

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
            siteId,
          ),
        );
        void dashboardStore.addWidgetToDashboard(
          dashboardStore.getDashboard(parseInt(dashboardId, 10))!,
          [savedMetric.metricId],
        );
      } else {
        history.replace(
          withSiteId(metricDetails(savedMetric.metricId), siteId),
        );
      }
    }
  };

  const updateLayout = (val: string) => {
    localStorage.setItem(LAYOUT_KEY, val);
    setLayout(val);
  };

  return (
    <Loader loading={loading}>
      <Prompt
        when={hasChanged}
        message={(loc: any) =>
          loc.pathname.includes('/metrics/') ||
          loc.pathname.includes('/metric/')
            ? true
            : 'You have unsaved changes. Are you sure you want to leave?'
        }
      />
      <div style={{ maxWidth: PANEL_SIZES.maxWidth, margin: 'auto' }}>
        <Breadcrumb
          items={[
            {
              label: dashboardName || 'Cards',
              to: dashboardId
                ? withSiteId(`/dashboard/${dashboardId}`, siteId)
                : withSiteId('/metrics', siteId),
            },
            { label: widget.name },
          ]}
        />
        <Space direction="vertical" className="w-full" size={14}>
          <WidgetViewHeader
            onSave={onSave}
            undoChanges={undoChanges}
            layoutControl={
              mobileScreen ? null : (
                <Segmented
                  size="small"
                  value={layout}
                  onChange={updateLayout}
                  options={[
                    {
                      value: 'flex-row',
                      icon: (
                        <Tooltip title={t('Filters on Left')}>
                          <LayoutPanelLeft size={16} />
                        </Tooltip>
                      ),
                    },
                    {
                      value: 'flex-col',
                      icon: (
                        <Tooltip title={t('Filters on Top')}>
                          <LayoutPanelTop size={16} />
                        </Tooltip>
                      ),
                    },
                    {
                      value: 'flex-row-reverse',
                      icon: (
                        <Tooltip title={t('Filters on Right')}>
                          <div className="rotate-180">
                            <LayoutPanelLeft size={16} />
                          </div>
                        </Tooltip>
                      ),
                    },
                  ]}
                />
              )
            }
          />
          <div className={cn('flex gap-4', layout)}>
            <div className={layout.startsWith('flex-row') ? 'w-1/3' : 'w-full'}>
              <WidgetFormNew layout={layout} />
            </div>
            <div className={layout.startsWith('flex-row') ? 'w-2/3' : 'w-full'}>
              <WidgetPreview name={widget.name} isEditing={expanded} />
              {widget.metricOf !== FilterKey.SESSIONS &&
                widget.metricOf !== FilterKey.ERRORS &&
                ([
                  TABLE,
                  TIMESERIES,
                  HEATMAP,
                  INSIGHTS,
                  FUNNEL,
                  USER_PATH,
                  WEBVITALS,
                ].includes(widget.metricType) ? (
                  <WidgetSessions />
                ) : null)}
              {widget.metricType === RETENTION && <CardUserList />}
            </div>
          </div>
        </Space>
      </div>
    </Loader>
  );
}

export default observer(WidgetView);

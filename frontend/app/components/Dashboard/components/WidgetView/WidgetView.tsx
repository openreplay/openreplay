import FilterItem from '@/mstore/types/filterItem';
import FilterSeries from '@/mstore/types/filterSeries';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Loader } from '@/ui/feedback/Loader';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { Segmented } from '@/ui/inputs/toggle-group';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { Modal } from '@/ui/overlays/modal';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { FilterKey } from 'Types/filter/filterType';
import copy from 'copy-to-clipboard';
import {
  Bell,
  Grid2x2Plus,
  Link2,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  PanelTop,
  Pencil,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  FUNNEL,
  HEATMAP,
  INSIGHTS,
  RETENTION,
  TABLE,
  TIMESERIES,
  USER_PATH,
  WEBVITALS,
} from 'App/constants/card';
import { useStore } from 'App/mstore';
import Widget from 'App/mstore/types/widget';
import { dashboardMetricDetails, metricDetails, withSiteId } from 'App/routes';
import { Prompt, useHistory, useLocation } from 'App/routing';
import { mobileScreen } from 'App/utils/isMobile';
import AlertFormModal from 'Components/Alerts/AlertFormModal/AlertFormModal';
import { CARD_LIST, type CardType } from 'Components/Dashboard/cardPresets';
import BreakdownFilter from 'Components/Dashboard/components/BreakdownFilter/BreakdownFilter';
import WidgetFormNew, {
  supportsBreakdown,
} from 'Components/Dashboard/components/WidgetForm/WidgetFormNew';
import { renderClickmapThumbnail } from 'Components/Dashboard/components/WidgetForm/renderMap';
import { useModal } from 'Components/ModalContext';

import { cardIcon, cardTypeLabel } from '../../cardIcons';
import '../../product-analytics.css';
import CardUserList from '../CardUserList/CardUserList';
import WidgetPreview from '../WidgetPreview';
import WidgetSessions from '../WidgetSessions';

interface Props {
  history: any;
  match: any;
  siteId: any;
}

type Layout = 'left' | 'top' | 'right';
const LAYOUT_KEY = '$__metric_form__layout__$';
const LEGACY_LAYOUT: Record<Layout, string> = {
  left: 'flex-row',
  top: 'flex-col',
  right: 'flex-row-reverse',
};

function readLayout(): Layout {
  if (mobileScreen) return 'top';
  try {
    const v = localStorage.getItem(LAYOUT_KEY);
    if (v === 'top' || v === 'flex-col') return 'top';
    if (v === 'right' || v === 'flex-row-reverse') return 'right';
  } catch {}
  return 'left';
}

function WidgetView({
  match: {
    params: { siteId, dashboardId, metricId },
  },
}: Props) {
  const { t } = useTranslation();
  const [layout, setLayoutState] = useState<Layout>(readLayout);
  const [renaming, setRenaming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();
  const { openModal, closeModal } = useModal();
  const {
    metricStore,
    dashboardStore,
    settingsStore,
    filterStore,
    alertsStore,
  } = useStore();
  const widget = metricStore.instance;
  const loading = metricStore.isLoading;
  const [expanded] = useState(!metricId || metricId === 'create');
  const { hasChanged } = widget;
  const history = useHistory();
  const location = useLocation();
  const queryDashboardId =
    dashboardId ||
    new URLSearchParams(location.search).get('dashboardId') ||
    undefined;
  const dashboard = dashboardStore.dashboards.find(
    (d: any) => d.dashboardId == queryDashboardId,
  );
  const dashboardName = dashboard ? dashboard.name : null;
  const [metricNotFound, setMetricNotFound] = useState(false);
  const [initialInstance, setInitialInstance] = useState();
  const isClickMap = widget.metricType === HEATMAP;
  // keeps the chart from fetching with the placeholder widget while the preset loads
  const [cardReady, setCardReady] = useState(
    () =>
      (!!metricId && metricId !== 'create') ||
      !new URLSearchParams(location.search).get('mk'),
  );

  useEffect(() => {
    const sync = async () => {
      if (!metricId || metricId === 'create') {
        const params = new URLSearchParams(location.search);
        const mk = params.get('mk');
        if (!mk) return;
        const selectedCard = CARD_LIST(t).find((c) => c.key === mk) as CardType;
        if (!selectedCard) return;
        setCardReady(false);

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
          const filters = [];
          for (const filter of selectedCard.filters) {
            const f = filterStore.findEvent({
              name: filter.name,
              autoCaptured: filter.autoCaptured,
            });
            if (filter.filters?.length) {
              f.filters = filter.filters;
            } else if (f.isEvent) {
              const props = await filterStore.getEventFilters(f.id);
              const defaults = props?.filter((p) => p.defaultProperty) || [];
              f.filters =
                selectedCard.cardType === WEBVITALS
                  ? defaults.map((d, i) =>
                      i === 0 ? { ...d, operator: 'isAny' } : d,
                    )
                  : defaults;
            }
            filters.push(f);
          }
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
          cardData.metricValue = ['location'];
        }

        if (selectedCard.cardType === HEATMAP) {
          cardData.series = [new FilterSeries()];
          cardData.series[0].maxEvents = 1;
          cardData.series[0].filter.addHeatmapDefaultFilters();
        }

        if (selectedCard.cardType === WEBVITALS) {
          cardData.series[0].maxEvents = 1;
        }

        metricStore.merge(cardData);
      }
    };
    sync().finally(() => setCardReady(true));
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
        widget.thumbnail = await renderClickmapThumbnail(true);
      } catch (e) {
        console.error(e);
      }
    }
    const savedMetric = await metricStore.save(widget);
    setInitialInstance(widget.toJson());
    if (wasCreating) {
      if (queryDashboardId && parseInt(queryDashboardId, 10) > 0) {
        history.replace(
          withSiteId(
            dashboardMetricDetails(queryDashboardId, savedMetric.metricId),
            siteId,
          ),
        );
        void dashboardStore.addWidgetToDashboard(
          dashboardStore.getDashboard(parseInt(queryDashboardId, 10))!,
          [savedMetric.metricId],
        );
      } else {
        history.replace(
          withSiteId(metricDetails(savedMetric.metricId), siteId),
        );
      }
    }
  };

  const setLayout = (l: Layout) => {
    try {
      localStorage.setItem(LAYOUT_KEY, l);
    } catch {}
    setLayoutState(l);
  };

  const copyLink = () => {
    copy(window.location.href);
    toast.success(t('Link copied to clipboard'));
  };

  const remove = () => {
    setDeleting(false);
    metricStore
      .delete(widget)
      .then(() => history.goBack())
      .catch(() => toast.error(t('Failed to remove card')));
  };

  const openAlert = () => {
    const seriesId = widget.series[0]?.seriesId || '';
    alertsStore.init({ query: { left: seriesId } } as any);
    openModal(<AlertFormModal onClose={closeModal} />, {
      placement: 'right',
      width: 620,
    });
  };

  const save = () => {
    if (widget.metricType === USER_PATH) widget.hideExcess = true;
    void onSave();
  };

  const KindIcon = cardIcon(widget.metricType, widget.metricOf);
  const kindLabel = cardTypeLabel(t, widget.metricType, widget.metricOf);
  const exists = widget.exists();
  const showsSessions =
    widget.metricOf !== FilterKey.SESSIONS &&
    widget.metricOf !== FilterKey.ERRORS &&
    [
      TABLE,
      TIMESERIES,
      HEATMAP,
      INSIGHTS,
      FUNNEL,
      USER_PATH,
      WEBVITALS,
    ].includes(widget.metricType);

  return (
    <Loader loading={loading || !cardReady}>
      <Prompt
        when={hasChanged}
        message={(loc: any) =>
          loc.pathname.includes('/metrics/') ||
          loc.pathname.includes('/metric/')
            ? true
            : 'You have unsaved changes. Are you sure you want to leave?'
        }
      />
      <PageCard
        back={{
          label: dashboardName || t('Cards'),
          onClick: () =>
            history.push(
              queryDashboardId
                ? withSiteId(`/dashboard/${queryDashboardId}`, siteId)
                : withSiteId('/metrics', siteId),
            ),
        }}
        title={widget.name}
        meta={
          <Tooltip title={kindLabel}>
            <span className="m-cardp__kind" aria-label={kindLabel}>
              <KindIcon size={13} aria-hidden="true" />
            </span>
          </Tooltip>
        }
        actions={
          <>
            <Button
              variant={!exists || hasChanged ? 'primary' : 'subtle'}
              disabled={metricStore.isSaving || (exists && !hasChanged)}
              onClick={save}
            >
              {exists ? t('Update') : t('Create')}
            </Button>
            <Tooltip
              title={
                exists
                  ? t('Copy link to clipboard')
                  : t('Save the card to get a link')
              }
            >
              <span>
                <IconButton
                  icon={<Link2 size={14} />}
                  label={t('Copy link')}
                  variant="outline"
                  disabled={!exists}
                  onClick={copyLink}
                />
              </span>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span>
                  <IconButton
                    icon={<MoreHorizontal size={15} />}
                    label={t('More')}
                    variant="ghost"
                  />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {mobileScreen ? null : (
                  <>
                    <div
                      className="m-cardp__arrange"
                      role="group"
                      aria-label={t('Definition')}
                    >
                      <span className="m-cardp__arrange-title">
                        {t('Definition')}
                      </span>
                      <Segmented<Layout>
                        value={layout}
                        onChange={setLayout}
                        ariaLabel={t('Definition')}
                        options={[
                          {
                            value: 'left',
                            icon: <PanelLeft size={14} />,
                            title: t('Definition on the left'),
                          },
                          {
                            value: 'top',
                            icon: <PanelTop size={14} />,
                            title: t('Definition on top'),
                          },
                          {
                            value: 'right',
                            icon: <PanelRight size={14} />,
                            title: t('Definition on the right'),
                          },
                        ]}
                      />
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItems
                  items={[
                    {
                      key: 'rename',
                      icon: <Pencil size={13} />,
                      label: t('Rename'),
                      onClick: () => setRenaming(true),
                    },
                    {
                      key: 'dashboard',
                      icon: <Grid2x2Plus size={13} />,
                      label: t('Add to dashboard'),
                      disabled: !exists,
                      onClick: () => setAdding(true),
                    },
                    {
                      key: 'alert',
                      icon: <Bell size={13} />,
                      label: t('Set alerts'),
                      disabled: !exists || widget.metricType !== TIMESERIES,
                      onClick: openAlert,
                    },
                    { key: 'd1', type: 'divider' },
                    {
                      key: 'delete',
                      icon: <Trash2 size={13} />,
                      label: t('Delete'),
                      danger: true,
                      disabled: !exists,
                      onClick: () => setDeleting(true),
                    },
                  ]}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        split
      >
        <div className={`m-cardp m-cardp--${layout}`}>
          <div className="m-cardp__side">
            <PagePanel
              spills
              head={<span className="m-pa__head-title">{t('Definition')}</span>}
            >
              <WidgetFormNew layout={LEGACY_LAYOUT[layout]} />
            </PagePanel>
            {supportsBreakdown(widget) ? (
              <BreakdownFilter
                metric={widget}
                observeChanges={() => widget.updateKey('hasChanged', true)}
              />
            ) : null}
          </div>
          <PagePanel
            head={<span className="m-pa__head-title">{t('Preview')}</span>}
          >
            <WidgetPreview name={widget.name} isEditing={expanded} />
          </PagePanel>
        </div>
        {showsSessions ? <WidgetSessions /> : null}
        {widget.metricType === RETENTION ? <CardUserList /> : null}
      </PageCard>

      <RenameDialog
        open={renaming}
        title={t('Rename card')}
        value={widget.name}
        onCancel={() => setRenaming(false)}
        onOk={(name) => {
          metricStore.merge({ name });
          setRenaming(false);
        }}
      />
      <AddToDashboard
        open={adding}
        onClose={() => setAdding(false)}
        metricId={widget.metricId}
      />
      <ConfirmDialog
        open={deleting}
        title={t('Remove this card?')}
        okText={t('Remove')}
        danger
        onCancel={() => setDeleting(false)}
        onOk={remove}
      >
        {t(
          '{{name}} is removed from the library and from every dashboard it is on. This action is permanent and cannot be undone.',
          { name: widget.name },
        )}
      </ConfirmDialog>
    </Loader>
  );
}

const AddToDashboard = observer(
  ({
    open,
    onClose,
    metricId,
  }: {
    open: boolean;
    onClose: () => void;
    metricId: number;
  }) => {
    const { t } = useTranslation();
    const { dashboardStore } = useStore();
    const [picked, setPicked] = useState<string[]>([]);
    const close = () => {
      setPicked([]);
      onClose();
    };
    const add = async () => {
      for (const id of picked) {
        const d = dashboardStore.getDashboard(id);
        if (d) await dashboardStore.addWidgetToDashboard(d, [metricId]);
      }
      close();
    };
    return (
      <Modal
        width={440}
        title={t('Add to dashboards')}
        open={open}
        onCancel={close}
        okText={
          picked.length > 1
            ? t('Add to {{n}} dashboards', { n: picked.length })
            : t('Add')
        }
        okDisabled={picked.length === 0}
        onOk={() => void add()}
      >
        <div className="m-cardp__dash-list">
          {dashboardStore.dashboards.map((d) => {
            const id = d.dashboardId!;
            return (
              <CheckRow
                key={id}
                on={picked.includes(id)}
                onToggle={() =>
                  setPicked((p) =>
                    p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
                  )
                }
                meta={d.isPublic ? t('Team') : t('Private')}
              >
                {d.name}
              </CheckRow>
            );
          })}
        </div>
      </Modal>
    );
  },
);

export default observer(WidgetView);

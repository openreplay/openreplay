import { MenuButton } from '@/ui/actions/menu-button';
import { Chip } from '@/ui/data/Chip';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PagePanel } from '@/ui/layout/PageCard';
import { toast } from '@/ui/overlays/toast';
import { FilterKey } from 'Types/filter/filterType';
import { DateTime } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { FUNNEL, HEATMAP, TABLE, USER_PATH } from 'App/constants/card';
import useIsMounted from 'App/hooks/useIsMounted';
import { useStore } from 'App/mstore';
import Session from 'App/types/session/session';
import { debounce } from 'App/utils';

import {
  type SessionField,
  SessionsTable,
} from 'Shared/SessionsTable/SessionsTable';
import { useOpenSession } from 'Shared/SessionsTable/useOpenSession';

import { checkIsSingleSeries } from '../WidgetForm/WidgetFormNew';

const getListSessionsBySeries = (
  data: {
    sessions: Session[];
    total: number;
    seriesId: string;
    seriesName: string;
  }[],
  seriesId: string,
) => {
  const result = data.reduce(
    (acc, { sessions, total, seriesId: id, seriesName }) => {
      const ids = new Set(acc.sessions.map((s) => s.sessionId));
      const newSessions = sessions.filter((s) => !ids.has(s.sessionId));
      if (seriesId === 'all' || [seriesName, id].includes(seriesId)) {
        acc.sessions.push(...newSessions);
        if ([seriesName, id].includes(seriesId))
          acc.total = total - (sessions.length - newSessions.length);
      }
      return acc;
    },
    { sessions: [], total: 0 } as { sessions: Session[]; total: number },
  );
  if (seriesId === 'all')
    result.total = Math.max(...data.map((d) => d.total), 0);

  result.sessions.sort((a, b) => b.startTs - a.startTs);
  return result;
};

function WidgetSessions() {
  const { t } = useTranslation();
  const { open, hover } = useOpenSession();
  const { dashboardStore, metricStore, sessionStore, filterStore } = useStore();
  const isMounted = useIsMounted();
  const listRef = useRef<HTMLDivElement>(null);

  const [activeSeries, setActiveSeries] = useState('all');
  const [seriesOptions, setSeriesOptions] = useState([
    { label: t('All'), value: 'all' },
  ]);
  const [data, setData] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const filter = dashboardStore.drillDownFilter;
  const widget = metricStore.instance;
  const isSingleSeries = checkIsSingleSeries(widget);
  const focused = metricStore.focusedSeriesName;

  const startTime = DateTime.fromMillis(filter.startTimestamp).toFormat(
    'LLL dd, yyyy HH:mm',
  );
  const endTime = DateTime.fromMillis(filter.endTimestamp).toFormat(
    'LLL dd, yyyy HH:mm',
  );

  const hasFilters =
    filter.filters.length > 0 ||
    filter.startTimestamp !== dashboardStore.drillDownPeriod.start ||
    filter.endTimestamp !== dashboardStore.drillDownPeriod.end;

  const filterText = useMemo(() => {
    if (!filter.filters.length) return '';

    const firstFilter = filter.filters[0];

    // 1. Screen resolution - use displayValue
    const hasScreenResolutionFilters = filter.filters.some(
      (f) =>
        f.name === FilterKey.SCREEN_WIDTH || f.name === FilterKey.SCREEN_HEIGHT,
    );

    if (hasScreenResolutionFilters) {
      const filterWithDisplay = filter.filters.find(
        (f) => (f as any).displayValue,
      );
      if (filterWithDisplay) {
        return (filterWithDisplay as any).displayValue;
      }
    }

    // 2. Event filter - get value from sub-filters
    if (
      (firstFilter as any).isEvent &&
      (firstFilter as any).filters?.length > 0
    ) {
      const subFilterWithValue = (firstFilter as any).filters.find(
        (f: any) => f.value && f.value.length > 0,
      );
      if (subFilterWithValue) {
        return subFilterWithValue.value[0] || '';
      }
    }

    // 3. Regular filter - use value directly
    return firstFilter?.value?.[0] || '';
  }, [filter.filters]);

  useEffect(() => {
    if (widget.series) {
      const opts = widget.series.map((item) => ({
        label: item.name,
        value: item.seriesId ?? item.name,
      }));
      setSeriesOptions([{ label: t('All'), value: 'all' }, ...opts]);
    }
  }, [widget.series, t]);

  const filteredSessions = useMemo(
    () => getListSessionsBySeries(data, activeSeries),
    [data, activeSeries],
  );

  const fetchSessions = useCallback(
    (metricId, flt) => {
      if (!isMounted()) return;
      const isDrilldown = !!flt.isDrilldown;
      if (
        !isDrilldown &&
        widget.metricType === FUNNEL &&
        flt.series?.[0]?.filter?.filters?.length === 0
      ) {
        setLoading(false);
        return setData([]);
      }

      setLoading(true);
      const { isDrilldown: _omit, ...rest } = flt;
      const params = { ...rest, filters: [...(flt.filters || [])] };
      if (widget.metricType === TABLE && widget.metricOf === 'REQUEST') {
        const reqFilter = filterStore.findEvent({ name: FilterKey.REQUEST });
        if (reqFilter) {
          params.filters.push(reqFilter);
        }
      }
      if (isDrilldown) {
        delete params.series;
      } else if (!params.series?.length) {
        params.series = widget.series.map((s) => s.toJson());
      }

      widget
        .fetchSessions(metricId, params)
        .then((res) => {
          setData(res ?? []);
          if (metricStore.drillDown) {
            toast.info(t('Sessions refreshed!'));
            listRef.current?.scrollIntoView({ behavior: 'smooth' });
            metricStore.setDrillDown(false);
          }
        })
        .catch((e) => {
          setData([]);
          console.error(e);
          toast.error(t('Failed to refresh sessions, try again later.'));
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [isMounted, widget, metricStore, t],
  );

  const fetchClickmapSessions = useCallback(
    (customFilters) => {
      sessionStore
        .getSessions(customFilters)
        .then((res) =>
          setData([{ ...res, seriesId: 1, seriesName: 'Clicks' }]),
        );
    },
    [sessionStore],
  );

  const debounceSessions = useMemo(
    () => debounce(fetchSessions, 1000),
    [fetchSessions],
  );
  const debounceClicks = useMemo(
    () => debounce(fetchClickmapSessions, 1000),
    [fetchClickmapSessions],
  );

  const filterDeps = widget.series
    .flatMap((s) => s.filter.filters.map((f) => JSON.stringify(f)))
    .join('$');
  const loadData = () => {
    if (widget.metricType === HEATMAP && metricStore.clickMapSearch) {
      const clickFilter = {
        value: [metricStore.clickMapSearch],
        name: 'CLICK',
        operator: 'onSelector',
        isEvent: true,
        filters: [],
      };
      const { rangeValue, start, end } = dashboardStore.drillDownPeriod;
      debounceClicks({
        ...filter,
        rangeValue,
        startDate: start,
        endDate: end,
        filters: [...sessionStore.userFilter.filters, clickFilter],
      });
    } else {
      const baseSeries = focused
        ? widget.series.filter(
            (s) => s.name === focused || focused.startsWith(s.name + ' / '),
          )
        : widget.series;
      const active = metricStore.disabledSeries.length
        ? baseSeries.filter((s) => !metricStore.disabledSeries.includes(s.name))
        : baseSeries;
      const seriesJson = active.map((s) => s.toJson());

      if (widget.metricType === USER_PATH) {
        if (
          !seriesJson[0].filter.filters[0]?.value[0] &&
          widget.data.nodes?.[0]
        ) {
          if (seriesJson[0].filter.filters[0]) {
            seriesJson[0].filter.filters[0].value = [widget.data.nodes[0].name];
          }
        }
      }

      const hasDrilldown = filter.filters.length > 0;
      const isFunnel = widget.metricType === FUNNEL;

      let finalFilters = filter.filters;
      let finalSeries: any[] = seriesJson;
      let isDrilldownRequest = false;

      if (hasDrilldown) {
        if (isFunnel && seriesJson.length > 0) {
          finalSeries = [
            {
              ...seriesJson[0],
              filter: {
                ...seriesJson[0].filter,
                filters: filter.filters.map((f) => ({ ...f })),
                eventsOrder: 'then',
              },
            },
          ];
          finalFilters = [];
        } else {
          const seriesFilters = seriesJson.flatMap(
            (s) => s.filter?.filters || [],
          );
          finalFilters = [...filter.filters, ...seriesFilters];
          finalSeries = [];
          isDrilldownRequest = true;
        }
      }

      debounceSessions(widget.metricId, {
        ...filter,
        filters: finalFilters,
        series: finalSeries,
        isDrilldown: isDrilldownRequest,
        metricType: widget.metricType,
        metricOf: widget.metricOf,
        page: metricStore.sessionsPage,
        limit: metricStore.sessionsPageSize,
      });
    }
  };

  const filterStr = JSON.stringify(filter.filters ?? []);
  useEffect(() => {
    changePage(1);
  }, [
    filter.startTimestamp,
    filter.endTimestamp,
    filter.filters.length,
    filterStr,
    widget.series.length,
    filterDeps,
    metricStore.clickMapSearch,
    focused,
    widget.startPoint,
    widget.data.nodes,
    metricStore.disabledSeries.length,
  ]);

  useEffect(() => {
    metricStore.setFocusedSeriesName(
      activeSeries === 'all'
        ? null
        : (seriesOptions.find((o) => o.value === activeSeries)?.label ?? null),
      false,
    );
  }, [activeSeries, metricStore, seriesOptions]);
  useEffect(() => {
    if (!focused) {
      setActiveSeries('all');
    } else {
      setActiveSeries(
        focused
          ? (seriesOptions.find(
              (o) => o.label === focused || focused.startsWith(o.label + ' / '),
            )?.value ?? 'all')
          : 'all',
      );
    }
  }, [focused, seriesOptions]);

  const clearFilters = () => {
    dashboardStore.resetDrillDownFilter();
    metricStore.setFocusedSeriesName(null, false);
    setActiveSeries('all');
    changePage(1);
  };

  const changePage = (page: number) => {
    metricStore.updateKey('sessionsPage', page);
    loadData();
  };

  return (
    <div ref={listRef}>
      <PagePanel
        head={
          <>
            <span className="m-pa__head-title">
              {metricStore.clickMapSearch ? t('Clicks') : t('Sessions')}
            </span>
            <span className="m-cardp__between">
              {metricStore.clickMapLabel
                ? `${t('on')} "${metricStore.clickMapLabel}" · `
                : ''}
              {t('between {{start}} and {{end}}', {
                start: startTime,
                end: endTime,
              })}
            </span>
            {hasFilters ? (
              <span className="m-cardp__drill">
                <Chip
                  kind="tag"
                  onRemove={clearFilters}
                  removeLabel={t('Clear drilldown')}
                >
                  {(widget.metricType === 'table' && filterText) ||
                    t('Drilldown')}
                </Chip>
              </span>
            ) : null}
            {isSingleSeries ? null : (
              <div className="m-page__controls">
                <MenuButton
                  ariaLabel={t('Filter by series')}
                  label={`${t('Filter by series')} · ${
                    seriesOptions.find((o) => o.value === activeSeries)
                      ?.label ?? t('All')
                  }`}
                  value={activeSeries}
                  onChange={setActiveSeries}
                  options={seriesOptions}
                  align="end"
                />
              </div>
            )}
          </>
        }
      >
        {loading && filteredSessions.sessions.length === 0 ? (
          <SkeletonRows rows={4} columns={[24, 16, 16, 28, 16]} />
        ) : filteredSessions.sessions.length === 0 ? (
          <p className="m-cardp__none">
            {t('No relevant sessions found for the selected time period.')}
          </p>
        ) : (
          <>
            <SessionsTable
              rows={filteredSessions.sessions}
              fields={CARD_FIELDS}
              onOpen={open}
              onHover={hover}
              liveBadge={false}
            />
            <ListFooter
              page={metricStore.sessionsPage}
              pageSize={metricStore.sessionsPageSize}
              total={filteredSessions.total}
              noun={[t('session'), t('sessions')]}
              onPage={changePage}
            />
          </>
        )}
      </PagePanel>
    </div>
  );
}

const CARD_FIELDS: readonly SessionField[] = [
  'started',
  'duration',
  'events',
  'pages',
  'location',
  'device',
];

export default observer(WidgetSessions);

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { NoContent, Loader, Pagination } from 'UI';
import { Button, Tag, Tooltip, Dropdown } from 'antd';
import { UndoOutlined, DownOutlined } from '@ant-design/icons';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import SessionItem from 'Shared/SessionItem';
import { observer } from 'mobx-react-lite';
import { DateTime } from 'luxon';
import { debounce, numberWithCommas } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { HEATMAP, USER_PATH, FUNNEL } from 'App/constants/card';
import { useTranslation } from 'react-i18next';
import Session from 'App/types/session/session';
import { toast } from 'react-toastify';
import { checkIsSingleSeries } from '../WidgetForm/WidgetFormNew';

const getListSessionsBySeries = (
  data: { sessions: Session[]; total: number; seriesId: string }[],
  seriesId: string,
) => {
  const result = data.reduce(
    (acc, { sessions, total, seriesId: id }) => {
      const ids = new Set(acc.sessions.map((s) => s.sessionId));
      const newSessions = sessions.filter((s) => !ids.has(s.sessionId));
      if (seriesId === 'all' || id === seriesId) {
        acc.sessions.push(...newSessions);
        if (id === seriesId)
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

function WidgetSessions({ className = '' }) {
  const { t } = useTranslation();
  const { dashboardStore, metricStore, sessionStore, customFieldStore } =
    useStore();
  const isMounted = useIsMounted();
  const listRef = useRef(null);

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
  const filterText = filter.filters[0]?.value || '';
  const metaList = customFieldStore.list.map((i) => i.key);

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
      if (
        widget.metricType === FUNNEL &&
        flt.series[0].filter.filters.length === 0
      ) {
        setLoading(false);
        return setData([]);
      }

      setLoading(true);
      const params = { ...flt, filters: [] };
      if (flt.filters?.length && params.series?.[0]?.filter) {
        if (widget.metricType === FUNNEL) {
          params.series[0].filter.filters = [...flt.filters];
        } else {
          params.series[0].filter.filters = [
            ...(flt.series[0].filter.filters || []),
            ...flt.filters,
          ];
        }
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
        ? widget.series.filter((s) => s.name === focused)
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

      debounceSessions(widget.metricId, {
        ...filter,
        series: seriesJson,
        metricType: widget.metricType,
        metricOf: widget.metricOf,
        page: metricStore.sessionsPage,
        limit: metricStore.sessionsPageSize,
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (metricStore.page === 1) {
      return;
    } else {
      metricStore.updateKey('sessionsPage', 1);
    }
  }, [
    filter.startTimestamp,
    filter.endTimestamp,
    filter.filters.length,
    widget.series,
    filterDeps,
    metricStore.clickMapSearch,
    focused,
    widget.startPoint,
    widget.data.nodes,
    metricStore.disabledSeries.length,
  ]);
  useEffect(() => loadData(), [metricStore.sessionsPage]);
  useEffect(() => {
    metricStore.setFocusedSeriesName(
      activeSeries === 'all'
        ? null
        : (seriesOptions.find((o) => o.value === activeSeries)?.label ?? null),
      false,
    );
  }, [activeSeries, metricStore, seriesOptions]);
  useEffect(() => {
    setActiveSeries(
      focused
        ? (seriesOptions.find((o) => o.label === focused)?.value ?? 'all')
        : 'all',
    );
  }, [focused, seriesOptions]);

  const clearFilters = () => {
    metricStore.updateKey('sessionsPage', 1);
    dashboardStore.resetDrillDownFilter();
    metricStore.setFocusedSeriesName(null, false);
    setActiveSeries('all');
  };

  const seriesDropdownItems = seriesOptions.map((opt) => ({
    key: opt.value,
    label: <div onClick={() => setActiveSeries(opt.value)}>{opt.label}</div>,
  }));

  return (
    <div
      className={cn(
        className,
        'bg-white p-3 pb-0 rounded-xl shadow-sm border mt-3',
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <div className="flex flex-col md:flex-row items-baseline gap-2">
            <h2 className="text-xl">
              {metricStore.clickMapSearch ? t('Clicks') : t('Sessions')}
            </h2>
            <div className="flex items-center gap-1">
              <div className="color-gray-medium">
                {metricStore.clickMapLabel &&
                  `on \"${metricStore.clickMapLabel}\" `}
                {t('between')}{' '}
                <span className="font-medium color-gray-darkest">
                  {startTime}
                </span>{' '}
                {t('and')}{' '}
                <span className="font-medium color-gray-darkest">
                  {endTime}
                </span>
              </div>
              {hasFilters && (
                <Tooltip title={t('Clear Drilldown')}>
                  <Button type="text" size="small" onClick={clearFilters}>
                    <UndoOutlined />
                  </Button>
                </Tooltip>
              )}
            </div>
          </div>
          {hasFilters && widget.metricType === 'table' && (
            <Tag
              closable
              onClose={clearFilters}
              className="truncate max-w-44 rounded-lg"
            >
              {filterText}
            </Tag>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isSingleSeries ? null : (
            <div className="flex items-center md:ml-6">
              <span className="mr-2 color-gray-medium">
                {t('Filter by Series')}
              </span>
              <Dropdown
                menu={{
                  items: seriesDropdownItems,
                  selectable: true,
                  selectedKeys: [activeSeries],
                }}
                trigger={['click']}
              >
                <Button type="text" size="small">
                  {seriesOptions.find((o) => o.value === activeSeries)?.label ||
                    t('Select Series')}
                  <DownOutlined />
                </Button>
              </Dropdown>
            </div>
          )}
        </div>
      </div>
      <div className="mt-3">
        <Loader loading={loading}>
          <NoContent
            show={filteredSessions.sessions.length === 0}
            title={
              <div className="flex flex-col items-center">
                <AnimatedSVG name={ICONS.NO_SESSIONS} size={60} />
                <div className="mt-4 text-center">
                  {t('No relevant sessions found for the selected time period')}
                </div>
              </div>
            }
          >
            {filteredSessions.sessions.map((s) => (
              <React.Fragment key={s.sessionId}>
                <SessionItem
                  noWrap
                  disableUser
                  session={s}
                  metaList={metaList}
                />
                <div className="border-b" />
              </React.Fragment>
            ))}
            <div
              className="flex items-center justify-between p-5"
              ref={listRef}
            >
              <div>
                {t('Showing')}{' '}
                <span className="font-medium">
                  {(metricStore.sessionsPage - 1) *
                    metricStore.sessionsPageSize +
                    1}
                </span>{' '}
                {t('to')}{' '}
                <span className="font-medium">
                  {(metricStore.sessionsPage - 1) *
                    metricStore.sessionsPageSize +
                    filteredSessions.sessions.length}
                </span>{' '}
                {t('of')}{' '}
                <span className="font-medium">
                  {numberWithCommas(filteredSessions.total)}
                </span>{' '}
                {t('sessions.')}
              </div>
              <Pagination
                page={metricStore.sessionsPage}
                total={filteredSessions.total}
                onPageChange={(p) => metricStore.updateKey('sessionsPage', p)}
                limit={metricStore.sessionsPageSize}
                debounceRequest={500}
              />
            </div>
          </NoContent>
        </Loader>
      </div>
    </div>
  );
}

export default observer(WidgetSessions);

import React, { useEffect, useState } from 'react';
import { NoContent, Loader, Pagination, Button } from 'UI';
import Select from 'Shared/Select';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import SessionItem from 'Shared/SessionItem';
import { observer } from 'mobx-react-lite';
import { DateTime } from 'luxon';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { numberWithCommas } from 'App/utils';
import { CLICKMAP } from 'App/constants/card';

interface Props {
  className?: string;
}
function WidgetSessions(props: Props) {
  const { className = '' } = props;
  const [activeSeries, setActiveSeries] = useState('all');
  const [data, setData] = useState<any>([]);
  const isMounted = useIsMounted();
  const [loading, setLoading] = useState(false);
  const filteredSessions = getListSessionsBySeries(data, activeSeries);
  const { dashboardStore, metricStore, sessionStore } = useStore();
  const filter = dashboardStore.drillDownFilter;
  const widget = metricStore.instance;
  const startTime = DateTime.fromMillis(filter.startTimestamp).toFormat('LLL dd, yyyy HH:mm');
  const endTime = DateTime.fromMillis(filter.endTimestamp).toFormat('LLL dd, yyyy HH:mm');
  const [seriesOptions, setSeriesOptions] = useState([{ label: 'All', value: 'all' }]);
  const hasFilters = filter.filters.length > 0 || (filter.startTimestamp !== dashboardStore.drillDownPeriod.start || filter.endTimestamp !== dashboardStore.drillDownPeriod.end);

  const writeOption = ({ value }: any) => setActiveSeries(value.value);
  useEffect(() => {
    if (!data) return;
    const seriesOptions = data.map((item: any) => ({
      label: item.seriesName,
      value: item.seriesId,
    }));
    setSeriesOptions([{ label: 'All', value: 'all' }, ...seriesOptions]);
  }, [data]);

  const fetchSessions = (metricId: any, filter: any) => {
    if (!isMounted()) return;
    setLoading(true);
    delete filter.eventsOrderSupport;
    widget
      .fetchSessions(metricId, filter)
      .then((res: any) => {
        setData(res);
      })
      .finally(() => {
        setLoading(false);
      });
  };
  const fetchClickmapSessions = (customFilters: Record<string, any>) => {
    sessionStore.getSessions(customFilters).then((data) => {
      setData([{ ...data, seriesId: 1, seriesName: 'Clicks' }]);
    });
  };
  const debounceRequest: any = React.useCallback(debounce(fetchSessions, 1000), []);
  const debounceClickMapSearch = React.useCallback(debounce(fetchClickmapSessions, 1000), []);

  const depsString = JSON.stringify(widget.series);

  const loadData = () => {
    if (widget.metricType === CLICKMAP && metricStore.clickMapSearch) {
      const clickFilter = {
        value: [metricStore.clickMapSearch],
        type: 'CLICK',
        operator: 'onSelector',
        isEvent: true,
        // @ts-ignore
        filters: [],
      };
      const timeRange = {
        rangeValue: dashboardStore.drillDownPeriod.rangeValue,
        startDate: dashboardStore.drillDownPeriod.start,
        endDate: dashboardStore.drillDownPeriod.end,
      };
      const customFilter = {
        ...filter,
        ...timeRange,
        filters: [...sessionStore.userFilter.filters, clickFilter],
      };
      debounceClickMapSearch(customFilter);
    } else {
      debounceRequest(widget.metricId, {
        ...filter,
        series: widget.series.map((s) => s.toJson()),
        page: metricStore.sessionsPage,
        limit: metricStore.sessionsPageSize,
      });
    }
  };
  useEffect(() => {
    metricStore.updateKey('sessionsPage', 1);
    loadData();
  }, [
    filter.startTimestamp,
    filter.endTimestamp,
    filter.filters,
    depsString,
    metricStore.clickMapSearch,
    activeSeries,
  ]);
  useEffect(loadData, [metricStore.sessionsPage]);

  const clearFilters = () => {
    metricStore.updateKey('sessionsPage', 1);
    dashboardStore.resetDrillDownFilter();
  }

  return (
    <div className={cn(className, 'bg-white p-3 pb-0 rounded border')}>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline">
          <h2 className="text-xl">{metricStore.clickMapSearch ? 'Clicks' : 'Sessions'}</h2>
          <div className="ml-2 color-gray-medium">
            {metricStore.clickMapLabel ? `on "${metricStore.clickMapLabel}" ` : null}
            between <span className="font-medium color-gray-darkest">{startTime}</span> and{' '}
            <span className="font-medium color-gray-darkest">{endTime}</span>{' '}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {hasFilters && <Button variant="text-primary" onClick={clearFilters}>Clear Filters</Button>}
          {widget.metricType !== 'table' && widget.metricType !== CLICKMAP && (
            <div className="flex items-center ml-6">
              <span className="mr-2 color-gray-medium">Filter by Series</span>
              <Select options={seriesOptions} defaultValue={'all'} onChange={writeOption} plain />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <Loader loading={loading}>
          <NoContent
            title={
              <div className="flex items-center justify-center flex-col">
                <AnimatedSVG name={ICONS.NO_SESSIONS} size={170} />
                <div className="mt-4" />
                <div className="text-center">
                  No relevant sessions found for the selected time period
                </div>
              </div>
            }
            show={filteredSessions.sessions.length === 0}
          >
            {filteredSessions.sessions.map((session: any) => (
              <React.Fragment key={session.sessionId}>
                <SessionItem session={session} />
                <div className="border-b" />
              </React.Fragment>
            ))}

            <div className="flex items-center justify-between p-5">
              <div>
                Showing{' '}
                <span className="font-medium">
                  {(metricStore.sessionsPage - 1) * metricStore.sessionsPageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {(metricStore.sessionsPage - 1) * metricStore.sessionsPageSize +
                    filteredSessions.sessions.length}
                </span>{' '}
                of <span className="font-medium">{numberWithCommas(filteredSessions.total)}</span>{' '}
                sessions.
              </div>
              <Pagination
                page={metricStore.sessionsPage}
                totalPages={Math.ceil(filteredSessions.total / metricStore.sessionsPageSize)}
                onPageChange={(page: any) => metricStore.updateKey('sessionsPage', page)}
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

const getListSessionsBySeries = (data: any, seriesId: any) => {
  const arr = data.reduce(
    (arr: any, element: any) => {
      if (seriesId === 'all') {
        const sessionIds = arr.sessions.map((i: any) => i.sessionId);
        const sessions = element.sessions.filter((i: any) => !sessionIds.includes(i.sessionId));
        arr.sessions.push(...sessions);
      } else if (element.seriesId === seriesId) {
        const sessionIds = arr.sessions.map((i: any) => i.sessionId);
        const sessions = element.sessions.filter((i: any) => !sessionIds.includes(i.sessionId));
        const duplicates = element.sessions.length - sessions.length;
        arr.sessions.push(...sessions);
        arr.total = element.total - duplicates;
      }
      return arr;
    },
    { sessions: [] }
  );
  arr.total =
    seriesId === 'all'
      ? Math.max(...data.map((i: any) => i.total))
      : data.find((i: any) => i.seriesId === seriesId).total;
  return arr;
};

export default observer(WidgetSessions);

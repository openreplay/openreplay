import React, { useEffect, useState } from 'react';
import { NoContent, Loader, Pagination } from 'UI';
import Select from 'Shared/Select';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import SessionItem from 'Shared/SessionItem';
import { observer, useObserver } from 'mobx-react-lite';
import { DateTime } from 'luxon';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';
import { numberWithCommas } from 'App/utils';

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
    const { dashboardStore, metricStore } = useStore();
    const filter = useObserver(() => dashboardStore.drillDownFilter);
    const widget: any = useObserver(() => metricStore.instance);
    const startTime = DateTime.fromMillis(filter.startTimestamp).toFormat('LLL dd, yyyy HH:mm');
    const endTime = DateTime.fromMillis(filter.endTimestamp).toFormat('LLL dd, yyyy HH:mm');
    const [seriesOptions, setSeriesOptions] = useState([{ label: 'All', value: 'all' }]);

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
        widget
            .fetchSessions(metricId, filter)
            .then((res: any) => {
                setData(res);
            })
            .finally(() => {
                setLoading(false);
            });
    };
    const debounceRequest: any = React.useCallback(debounce(fetchSessions, 1000), []);

    const depsString = JSON.stringify(widget.series);
    useEffect(() => {
        debounceRequest(widget.metricId, {
            ...filter,
            series: widget.toJsonDrilldown(),
            page: metricStore.sessionsPage,
            limit: metricStore.sessionsPageSize,
        });
    }, [filter.startTimestamp, filter.endTimestamp, filter.filters, depsString, metricStore.sessionsPage]);

    return useObserver(() => (
        <div className={cn(className, "bg-white p-3 pb-0 rounded border")}>
            <div className="flex items-center justify-between">
                <div className="flex items-baseline">
                    <h2 className="text-2xl">Sessions</h2>
                    <div className="ml-2 color-gray-medium">
                        between <span className="font-medium color-gray-darkest">{startTime}</span> and{' '}
                        <span className="font-medium color-gray-darkest">{endTime}</span>{' '}
                    </div>
                </div>

                {widget.metricType !== 'table' && (
                    <div className="flex items-center ml-6">
                        <span className="mr-2 color-gray-medium">Filter by Series</span>
                        <Select options={seriesOptions} defaultValue={'all'} onChange={writeOption} plain />
                    </div>
                )}
            </div>

            <div className="mt-3">
                <Loader loading={loading}>
                    <NoContent
                        title={
                            <div className="flex items-center justify-center flex-col">
                                <AnimatedSVG name={ICONS.NO_SESSIONS} size={170} />
                                <div className="mt-2" />
                                <div className="text-center text-gray-600">No relevant sessions found for the selected time period.</div>
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
                                Showing <span className="font-medium">{(metricStore.sessionsPage - 1) * metricStore.sessionsPageSize + 1}</span> to{' '}
                                <span className="font-medium">{(metricStore.sessionsPage - 1) * metricStore.sessionsPageSize + filteredSessions.sessions.length}</span> of{' '}
                                <span className="font-medium">{numberWithCommas(filteredSessions.total)}</span> sessions.
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
    ));
}

const getListSessionsBySeries = (data: any, seriesId: any) => {
    const arr: any = { sessions: [], total: 0 };
    data.forEach((element: any) => {
        if (seriesId === 'all') {
            const sessionIds = arr.sessions.map((i: any) => i.sessionId);
            arr.sessions.push(...element.sessions.filter((i: any) => !sessionIds.includes(i.sessionId)));
            arr.total = element.total;
        } else {
            if (element.seriesId === seriesId) {
                arr.sessions.push(...element.sessions);
                arr.total = element.total;
            }
        }
    });
    return arr;
};

export default observer(WidgetSessions);

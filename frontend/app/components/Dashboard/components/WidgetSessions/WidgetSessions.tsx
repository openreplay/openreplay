import React, { useEffect, useState } from 'react';
import { NoContent, Dropdown, Icon, Loader, Pagination } from 'UI';
import Select from 'Shared/Select';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import SessionItem from 'Shared/SessionItem';
import { observer, useObserver } from 'mobx-react-lite';
import { DateTime } from 'luxon';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted'
import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

interface Props {
    className?: string;
}
function WidgetSessions(props: Props) {
    const { className = '' } = props;
    const [data, setData] = useState<any>([]);
    const isMounted = useIsMounted()
    const [loading, setLoading] = useState(false);
    const [seriesOptions, setSeriesOptions] = useState([
        { label: 'All', value: 'all' },
    ]);

    const [activeSeries, setActiveSeries] = useState('all');

    const writeOption = (e, { name, value }) => setActiveSeries(value.value);
    useEffect(() => {
        if (!data) return;
        const seriesOptions = data.map(item => ({
            label: item.seriesName,
            value: item.seriesId,
        }));
        setSeriesOptions([
            { label: 'All', value: 'all' },
            ...seriesOptions,
        ]);
    }, [data]);

    const fetchSessions = (metricId, filter) => {
        if (!isMounted()) return;
        setLoading(true)
        widget.fetchSessions(metricId, filter).then(res => {
            setData(res)
        }).finally(() => {
            setLoading(false)
        });
    }

    const filteredSessions = getListSessionsBySeries(data, activeSeries);
    const { dashboardStore, metricStore } = useStore();
    const filter = useObserver(() => dashboardStore.drillDownFilter);
    const widget: any = useObserver(() => metricStore.instance);
    const startTime = DateTime.fromMillis(filter.startTimestamp).toFormat('LLL dd, yyyy HH:mm a');
    const endTime = DateTime.fromMillis(filter.endTimestamp).toFormat('LLL dd, yyyy HH:mm a');
    const debounceRequest: any = React.useCallback(debounce(fetchSessions, 1000), []);

    const depsString = JSON.stringify(widget.series);
    useEffect(() => {
        debounceRequest(widget.metricId, { ...filter, series: widget.toJsonDrilldown(), page: metricStore.sessionsPage, limit: metricStore.sessionsPageSize });
    }, [filter.startTimestamp, filter.endTimestamp, filter.filters, depsString, metricStore.sessionsPage]);

    return useObserver(() => (
        <div className={cn(className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-baseline">
                    <h2 className="text-2xl">Sessions</h2>
                    <div className="ml-2 color-gray-medium">between <span className="font-medium color-gray-darkest">{startTime}</span> and <span className="font-medium color-gray-darkest">{endTime}</span> </div>
                </div>

                { widget.metricType !== 'table' && (
                    <div className="flex items-center ml-6">
                        <span className="mr-2 color-gray-medium">Series</span>
                        {/* <Dropdown
                            // className={stl.dropdown}
                            className="font-medium flex items-center hover:bg-gray-light rounded px-2 py-1"
                            direction="left"
                            options={ seriesOptions }
                            name="change"
                            value={ activeSeries }
                            onChange={ writeOption }
                            id="change-dropdown"
                            // icon={null}
                            icon={ <Icon name="chevron-down" color="gray-dark" size="14" className="ml-2" /> }
                        /> */}
                        <Select
                            options={ seriesOptions }
                            onChange={ writeOption }
                            plain
                        />
                    </div>
                )}
            </div>

            <div className="mt-3">
                <Loader loading={loading}>
                    <NoContent
                        title={
                            <div className="flex flex-col items-center justify-center">
                                <AnimatedSVG name={ICONS.NO_RESULTS} size="170" />
                                <div className="mt-6 text-2xl">No recordings found</div>
                            </div>
                        }
                        show={filteredSessions.sessions.length === 0}
                        // animatedIcon="no-results"
                    >
                        {filteredSessions.sessions.map((session: any) => (
                            <SessionItem key={ session.sessionId } session={ session }  />
                        ))}

                        <div className="w-full flex items-center justify-center py-6">
                            <Pagination
                                page={metricStore.sessionsPage}
                                totalPages={Math.ceil(filteredSessions.total / metricStore.sessionsPageSize)}
                                onPageChange={(page) => metricStore.updateKey('sessionsPage', page)}
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

const getListSessionsBySeries = (data, seriesId) => {
    const arr: any = { sessions: [], total: 0 };
    data.forEach(element => {
        if (seriesId === 'all') {
            const sessionIds = arr.sessions.map(i => i.sessionId);
            arr.sessions.push(...element.sessions.filter(i => !sessionIds.includes(i.sessionId)));
            arr.total = element.total
        } else {
            if (element.seriesId === seriesId) {
                arr.sessions.push(...element.sessions)
                arr.total = element.total
            }
        }
    });
    return arr;
}

export default observer(WidgetSessions);

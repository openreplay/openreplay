import React, { useEffect, useState } from 'react';
import { NoContent, Dropdown, Icon, Loader } from 'UI';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import SessionItem from 'Shared/SessionItem';
import { observer, useObserver } from 'mobx-react-lite';
import { DateTime } from 'luxon';
interface Props {
    className?: string;
}
function WidgetSessions(props: Props) {
    const { className = '' } = props;
    const [data, setData] = useState<any>([]);
    const [seriesOptions, setSeriesOptions] = useState([
        { text: 'All', value: 'all' },
    ]);

    const [activeSeries, setActiveSeries] = useState('all');

    const writeOption = (e, { name, value }) => setActiveSeries(value);
    useEffect(() => {
        if (!data) return;
        const seriesOptions = data.map(item => ({
            text: item.seriesName,
            value: item.seriesId,
        }));
        setSeriesOptions([
            { text: 'All', value: 'all' },
            ...seriesOptions,
        ]);
    }, [data]);

    const filteredSessions = getListSessionsBySeries(data, activeSeries);
    const { dashboardStore, metricStore } = useStore();
    const filter = useObserver(() => dashboardStore.drillDownFilter);
    const widget: any = metricStore.instance;
    const startTime = DateTime.fromMillis(filter.startTimestamp).toFormat('LLL dd, yyyy HH:mm a');
    const endTime = DateTime.fromMillis(filter.endTimestamp).toFormat('LLL dd, yyyy HH:mm a');

    useEffect(() => {
        widget.fetchSessions({ ...filter, filter: widget.toJsonDrilldown()}).then(res => {
            console.log('res', res)
            setData(res);
        });
    }, [filter.startTimestamp, filter.endTimestamp, widget.filter]);

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
                        <Dropdown
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
                        />
                    </div>
                )}
            </div>

            <div className="mt-3">
                <Loader loading={widget.sessionsLoading}>
                    <NoContent
                        title="No recordings found"
                        show={filteredSessions.length === 0}
                        animatedIcon="no-results"
                    >
                        {filteredSessions.map((session: any) => (
                            <SessionItem key={ session.sessionId } session={ session }  />
                        ))}
                    </NoContent>
                </Loader>
            </div>
        </div>
    ));
}

const getListSessionsBySeries = (data, seriesId) => {
    const arr: any = []
    data.forEach(element => {
        if (seriesId === 'all') {
            const sessionIds = arr.map(i => i.sessionId);
            arr.push(...element.sessions.filter(i => !sessionIds.includes(i.sessionId)));
        } else {
            if (element.seriesId === seriesId) {
                arr.push(...element.sessions)
            }
        }
    });
    return arr;
}

export default observer(WidgetSessions);
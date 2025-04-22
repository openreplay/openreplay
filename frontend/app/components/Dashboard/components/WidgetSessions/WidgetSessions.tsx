import React, {useEffect, useState} from 'react';
import {NoContent, Loader, Pagination} from 'UI';
import {Button, Tag, Tooltip, Dropdown, message} from 'antd';
import {UndoOutlined, DownOutlined} from '@ant-design/icons';
import cn from 'classnames';
import {useStore} from 'App/mstore';
import SessionItem from 'Shared/SessionItem';
import {observer} from 'mobx-react-lite';
import {DateTime} from 'luxon';
import {debounce, numberWithCommas} from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import AnimatedSVG, {ICONS} from 'Shared/AnimatedSVG/AnimatedSVG';
import {HEATMAP, USER_PATH, FUNNEL} from 'App/constants/card';
import {useTranslation} from 'react-i18next';

interface Props {
    className?: string;
}

function WidgetSessions(props: Props) {
    const {t} = useTranslation();
    const listRef = React.useRef<HTMLDivElement>(null);
    const {className = ''} = props;
    const [activeSeries, setActiveSeries] = useState('all');
    const [data, setData] = useState<any>([]);
    const isMounted = useIsMounted();
    const [loading, setLoading] = useState(false);
    // all filtering done through series now
    const filteredSessions = getListSessionsBySeries(data, 'all');
    const {dashboardStore, metricStore, sessionStore, customFieldStore} =
        useStore();
    const focusedSeries = metricStore.focusedSeriesName;
    const filter = dashboardStore.drillDownFilter;
    const widget = metricStore.instance;
    const startTime = DateTime.fromMillis(filter.startTimestamp).toFormat(
        'LLL dd, yyyy HH:mm',
    );
    const endTime = DateTime.fromMillis(filter.endTimestamp).toFormat(
        'LLL dd, yyyy HH:mm',
    );
    const [seriesOptions, setSeriesOptions] = useState([
        {label: t('All'), value: 'all'},
    ]);
    const hasFilters =
        filter.filters.length > 0 ||
        filter.startTimestamp !== dashboardStore.drillDownPeriod.start ||
        filter.endTimestamp !== dashboardStore.drillDownPeriod.end;
    const filterText = filter.filters.length > 0 ? filter.filters[0].value : '';
    const metaList = customFieldStore.list.map((i: any) => i.key);

    const seriesDropdownItems = seriesOptions.map((option) => ({
        key: option.value,
        label: (
            <div onClick={() => setActiveSeries(option.value)}>{option.label}</div>
        ),
    }));

    useEffect(() => {
        if (!widget.series) return;
        const seriesOptions = widget.series.map((item: any) => ({
            label: item.name,
            value: item.seriesId ?? item.name,
        }));
        setSeriesOptions([{label: t('All'), value: 'all'}, ...seriesOptions]);
    }, [widget.series.length]);

    const fetchSessions = (metricId: any, filter: any) => {
        if (!isMounted()) return;

        if (widget.metricType === FUNNEL) {
            if (filter.series[0].filter.filters.length === 0) {
                setLoading(false);
                return setData([]);
            }
        }


        setLoading(true);
        const filterCopy = {...filter};
        delete filterCopy.eventsOrderSupport;

        try {
            // Handle filters properly with null checks
            if (filterCopy.filters && filterCopy.filters.length > 0) {
                // Ensure the nested path exists before pushing
                if (filterCopy.series?.[0]?.filter) {
                    if (!filterCopy.series[0].filter.filters) {
                        filterCopy.series[0].filter.filters = [];
                    }
                    filterCopy.series[0].filter.filters.push(...filterCopy.filters);
                }
                filterCopy.filters = [];
            }
        } catch (e) {
            // do nothing
        }
        widget
            .fetchSessions(metricId, filterCopy)
            .then((res: any) => {
                setData(res);
                if (metricStore.drillDown) {
                    setTimeout(() => {
                        message.info(t('Sessions Refreshed!'));
                        listRef.current?.scrollIntoView({behavior: 'smooth'});
                        metricStore.setDrillDown(false);
                    }, 0);
                }
            })
            .finally(() => {
                setLoading(false);
            });
    };
    const fetchClickmapSessions = (customFilters: Record<string, any>) => {
        sessionStore.getSessions(customFilters).then((data) => {
            setData([{...data, seriesId: 1, seriesName: 'Clicks'}]);
        });
    };
    const debounceRequest: any = React.useCallback(
        debounce(fetchSessions, 1000),
        [],
    );
    const debounceClickMapSearch = React.useCallback(
        debounce(fetchClickmapSessions, 1000),
        [],
    );

    const depsString = JSON.stringify(widget.series);

    const loadData = () => {
        if (widget.metricType === HEATMAP && metricStore.clickMapSearch) {
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
            const hasStartPoint =
                !!widget.startPoint && widget.metricType === USER_PATH;
            const onlyFocused = focusedSeries
                ? widget.series.filter((s) => s.name === focusedSeries)
                : widget.series;
            const activeSeries = metricStore.disabledSeries.length
                ? onlyFocused.filter(
                    (s) => !metricStore.disabledSeries.includes(s.name),
                )
                : onlyFocused;
            const seriesJson = activeSeries.map((s) => s.toJson());
            if (hasStartPoint) {
                seriesJson[0].filter.filters.push(widget.startPoint.toJson());
            }
            if (widget.metricType === USER_PATH) {
                if (
                    seriesJson[0].filter.filters[0].value[0] === '' &&
                    widget.data.nodes?.length
                ) {
                    seriesJson[0].filter.filters[0].value = widget.data.nodes[0].name;
                } else if (
                    seriesJson[0].filter.filters[0].value[0] === '' &&
                    !widget.data.nodes?.length
                ) {
                    // no point requesting if we don't have starting point picked by api
                    return;
                }
            }
            debounceRequest(widget.metricId, {
                ...filter,
                series: seriesJson,
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
        focusedSeries,
        widget.startPoint,
        widget.data.nodes,
        metricStore.disabledSeries.length,
    ]);
    useEffect(loadData, [metricStore.sessionsPage]);
    useEffect(() => {
        if (activeSeries === 'all') {
            metricStore.setFocusedSeriesName(null);
        } else {
            metricStore.setFocusedSeriesName(
                seriesOptions.find((option) => option.value === activeSeries)?.label,
                false,
            );
        }
    }, [activeSeries]);
    useEffect(() => {
        if (focusedSeries) {
            setActiveSeries(
                seriesOptions.find((option) => option.label === focusedSeries)?.value ||
                'all',
            );
        } else {
            setActiveSeries('all');
        }
    }, [focusedSeries]);

    const clearFilters = () => {
        metricStore.updateKey('sessionsPage', 1);
        dashboardStore.resetDrillDownFilter();
    };

    return (
        <div
            className={cn(
                className,
                'bg-white p-3 pb-0 rounded-xl shadow-sm border mt-3',
            )}
        >
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-xl">
                            {metricStore.clickMapSearch ? t('Clicks') : t('Sessions')}
                        </h2>
                        <div className="ml-2 color-gray-medium">
                            {metricStore.clickMapLabel
                                ? `on "${metricStore.clickMapLabel}" `
                                : null}
                            {t('between')}{' '}
                            <span className="font-medium color-gray-darkest">
                {startTime}
              </span>{' '}
                            {t('and')}{' '}
                            <span className="font-medium color-gray-darkest">
                {endTime}
              </span>{' '}
                        </div>
                        {hasFilters && (
                            <Tooltip title={t('Clear Drilldown')} placement="top">
                                <Button type="text" size="small" onClick={clearFilters}>
                                    <UndoOutlined/>
                                </Button>
                            </Tooltip>
                        )}
                    </div>

                    {hasFilters && widget.metricType === 'table' && (
                        <div className="py-2">
                            <Tag
                                closable
                                onClose={clearFilters}
                                className="truncate max-w-44 rounded-lg"
                            >
                                {filterText}
                            </Tag>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {widget.metricType !== 'table' && widget.metricType !== HEATMAP && (
                        <div className="flex items-center ml-6">
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
                                    {seriesOptions.find((option) => option.value === activeSeries)
                                        ?.label || t('Select Series')}
                                    <DownOutlined/>
                                </Button>
                            </Dropdown>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-3">
                <Loader loading={loading}>
                    <NoContent
                        title={
                            <div className="flex items-center justify-center flex-col">
                                <AnimatedSVG name={ICONS.NO_SESSIONS} size={60}/>
                                <div className="mt-4"/>
                                <div className="text-center">
                                    {t('No relevant sessions found for the selected time period')}
                                </div>
                            </div>
                        }
                        show={filteredSessions.sessions.length === 0}
                    >
                        {filteredSessions.sessions.map((session: any) => (
                            <React.Fragment key={session.sessionId}>
                                <SessionItem
                                    disableUser
                                    session={session}
                                    metaList={metaList}
                                />
                                <div className="border-b"/>
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
                                onPageChange={(page: any) =>
                                    metricStore.updateKey('sessionsPage', page)
                                }
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
                const sessions = element.sessions.filter(
                    (i: any) => !sessionIds.includes(i.sessionId),
                );
                arr.sessions.push(...sessions);
            } else if (element.seriesId === seriesId) {
                const sessionIds = arr.sessions.map((i: any) => i.sessionId);
                const sessions = element.sessions.filter(
                    (i: any) => !sessionIds.includes(i.sessionId),
                );
                const duplicates = element.sessions.length - sessions.length;
                arr.sessions.push(...sessions);
                arr.total = element.total - duplicates;
            }
            return arr;
        },
        {sessions: []},
    );
    arr.total =
        seriesId === 'all'
            ? Math.max(...data.map((i: any) => i.total))
            : data.find((i: any) => i.seriesId === seriesId).total;
    return arr;
};

export default observer(WidgetSessions);

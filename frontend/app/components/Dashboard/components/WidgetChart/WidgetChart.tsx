import React, { useState, useRef, useEffect, useCallback } from 'react';
import CustomMetriLineChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetriLineChart';
import CustomMetricPercentage from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPercentage';
import CustomMetricTable from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTable';
import CustomMetricPieChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPieChart';
import { Styles } from 'App/components/Dashboard/Widgets/common';
import { observer, useObserver } from 'mobx-react-lite';
import { Loader } from 'UI';
import { useStore } from 'App/mstore';
import WidgetPredefinedChart from '../WidgetPredefinedChart';
import CustomMetricOverviewChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricOverviewChart';
import { getStartAndEndTimestampsByDensity } from 'Types/dashboard/helper';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted'
import { FilterKey } from 'Types/filter/filterType';

import FunnelWidget from 'App/components/Funnels/FunnelWidget';
import ErrorsWidget from '../Errors/ErrorsWidget';
import SessionWidget from '../Sessions/SessionWidget';
import CustomMetricTableSessions from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableSessions';
import CustomMetricTableErrors from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableErrors';
interface Props {
    metric: any;
    isWidget?: boolean;
    isTemplate?: boolean;
}
function WidgetChart(props: Props) {
    const { isWidget = false, metric, isTemplate } = props;
    const { dashboardStore, metricStore } = useStore();
    const _metric: any = metricStore.instance;
    const period = useObserver(() => dashboardStore.period);
    const drillDownPeriod = useObserver(() => dashboardStore.drillDownPeriod);
    const drillDownFilter = dashboardStore.drillDownFilter;
    const colors = Styles.customMetricColors;
    const [loading, setLoading] = useState(true)
    const isOverviewWidget = metric.metricType === 'predefined' && metric.viewType === 'overview';
    const params = { density: isOverviewWidget ? 7 : 70 }
    const metricParams = { ...params }
    const prevMetricRef = useRef<any>();
    const isMounted = useIsMounted();
    const [data, setData] = useState<any>(metric.data);

    const isTableWidget = metric.metricType === 'table' && metric.viewType === 'table';
    const isPieChart = metric.metricType === 'table' && metric.viewType === 'pieChart';

    const onChartClick = (event: any) => {
        if (event) {
            if (isTableWidget || isPieChart) { // get the filter of clicked row
                const periodTimestamps = period.toTimestamps()
                drillDownFilter.merge({
                    filters: event,
                    startTimestamp: periodTimestamps.startTimestamp,
                    endTimestamp: periodTimestamps.endTimestamp,
                });
            } else { // get the filter of clicked chart point
                const payload = event.activePayload[0].payload;
                const timestamp = payload.timestamp;
                const periodTimestamps = getStartAndEndTimestampsByDensity(timestamp, drillDownPeriod.start, drillDownPeriod.end, params.density);

                drillDownFilter.merge({
                    startTimestamp: periodTimestamps.startTimestamp,
                    endTimestamp: periodTimestamps.endTimestamp,
                });
            }
        }
    }

    const depsString = JSON.stringify(_metric.series);
    const fetchMetricChartData = (metric: any, payload: any, isWidget: any, period: any) => {
        if (!isMounted()) return;
        setLoading(true)
        dashboardStore.fetchMetricChartData(metric, payload, isWidget, period).then((res: any) => {
            if (isMounted()) setData(res);
        }).finally(() => {
            setLoading(false);
        });
    }

    const debounceRequest: any = React.useCallback(debounce(fetchMetricChartData, 500), []);
    useEffect(() => {
        if (prevMetricRef.current && prevMetricRef.current.name !== metric.name) {
            prevMetricRef.current = metric;
            return
        };
        prevMetricRef.current = metric;
        const timestmaps = drillDownPeriod.toTimestamps();
        const payload = isWidget ? { ...params } : { ...metricParams, ...timestmaps, ...metric.toJson() };
        debounceRequest(metric, payload, isWidget, !isWidget ? drillDownPeriod : period);
    }, [drillDownPeriod, period, depsString, _metric.page, metric.metricType, metric.metricOf, metric.viewType]);


    const renderChart = () => {
        const { metricType, viewType, metricOf } = metric;

        const metricWithData = { ...metric, data };
        if (metricType === 'sessions') {
            return <SessionWidget metric={metric} data={data} />
        }

        if (metricType === 'errors') {
            return <ErrorsWidget metric={metric} data={data} />
        }

        if (metricType === 'funnel') {
            return <FunnelWidget metric={metric} data={data} isWidget={isWidget || isTemplate} />
        }

        if (metricType === 'predefined') {
            const defaultMetric = metric.data.chart.length === 0 ? metricWithData : metric
            if (isOverviewWidget) {
                return <CustomMetricOverviewChart data={data} />
            }
            return <WidgetPredefinedChart isTemplate={isTemplate} metric={defaultMetric} data={data} predefinedKey={metric.predefinedKey} />
        }

        if (metricType === 'timeseries') {
            if (viewType === 'lineChart') {
                return (
                    <CustomMetriLineChart
                        data={data}
                        colors={colors}
                        params={params}
                        onClick={onChartClick}
                    />
                )
            } else if (viewType === 'progress') {
                return (
                    <CustomMetricPercentage
                        data={data[0]}
                        colors={colors}
                        params={params}
                    />
                )
            }
        }

        if (metricType === 'table') {
            if (metricOf === FilterKey.SESSIONS) {
                return (
                    <CustomMetricTableSessions
                        metric={metric}
                        data={data}
                        isTemplate={isTemplate}
                        isEdit={!isWidget && !isTemplate}
                    />
                )
            }
            if (metricOf === FilterKey.ERRORS) {
                return (
                    <CustomMetricTableErrors
                        metric={metric}
                        data={data}
                        // isTemplate={isTemplate}
                        isEdit={!isWidget && !isTemplate}
                    />
                )
            }
            if (viewType === 'table') {
                return (
                    <CustomMetricTable
                        metric={metric} data={data[0]}
                        onClick={onChartClick}
                        isTemplate={isTemplate}
                    />
                )
            } else if (viewType === 'pieChart') {
                return (
                    <CustomMetricPieChart
                        metric={metric}
                        data={data[0]}
                        colors={colors}
                        // params={params}
                        onClick={onChartClick}
                    />
                )
            }
        }

        return <div>Unknown</div>;
    }
    return (
        <Loader loading={loading} style={{ height: `${isOverviewWidget ? 100 : 240}px` }}>
            <div style={{ minHeight: isOverviewWidget ? 100 : 240 }}>{renderChart()}</div>
        </Loader>
    );
}

export default observer(WidgetChart);

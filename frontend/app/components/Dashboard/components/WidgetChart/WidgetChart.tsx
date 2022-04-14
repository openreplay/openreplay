import React, { useState, useRef, useEffect } from 'react';
import CustomMetriLineChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetriLineChart';
import CustomMetricPercentage from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPercentage';
import CustomMetricTable from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTable';
import CustomMetricPieChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPieChart';
import { Styles } from 'App/components/Dashboard/Widgets/common';
import { useObserver } from 'mobx-react-lite';
import { Loader } from 'UI';
import { useStore } from 'App/mstore';
import WidgetPredefinedChart from '../WidgetPredefinedChart';
import CustomMetricOverviewChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricOverviewChart';
import { getStartAndEndTimestampsByDensity } from 'Types/dashboard/helper'; 
interface Props {
    metric: any;
    isWidget?: boolean
    onClick?: () => void;
}
function WidgetChart(props: Props) {
    const { isWidget = false, metric } = props;
    const { dashboardStore } = useStore();
    const period = useObserver(() => dashboardStore.period);
    const drillDownFilter = useObserver(() => dashboardStore.drillDownFilter);
    const colors = Styles.customMetricColors;
    const [loading, setLoading] = useState(false)
    const isOverviewWidget = metric.metricType === 'predefined' && metric.viewType === 'overview';
    const params = { density: isOverviewWidget ? 7 : 70 } 
    const metricParams = { ...params }
    const prevMetricRef = useRef<any>();
    const [data, setData] = useState<any>(metric.data);

    const onChartClick = (event: any) => {
        if (event) {
            const payload = event.activePayload[0].payload;
            const timestamp = payload.timestamp;
            const periodTimestamps = metric.metricType === 'timeseries' ?
              getStartAndEndTimestampsByDensity(timestamp, period.start, period.end, params.density) :
              period.toTimestamps();

            drillDownFilter.merge({
                startTimestamp: periodTimestamps.startTimestamp,
                endTimestamp: periodTimestamps.endTimestamp,
            });
            
            // const activeWidget = {
            //   widget: metric,
            //   period: period,
            //   ...periodTimestamps,
            //   timestamp: payload.timestamp,
            //   index,
            // }
        }
    }

    useEffect(() => {
        if (prevMetricRef.current && prevMetricRef.current.name !== metric.name) {
          prevMetricRef.current = metric;
          return
        };
        prevMetricRef.current = metric;
        
        setLoading(true);
        const payload = isWidget ? { ...params } : { ...metricParams, ...metric.toJson() };
        dashboardStore.fetchMetricChartData(metric, payload, isWidget).then((res: any) => {
            setData(res);
        }).finally(() => {
            setLoading(false);
        });
    }, [period]);

    const renderChart = () => {
        const { metricType, viewType } = metric;

        if (metricType === 'predefined') {
            if (isOverviewWidget) {
                return <CustomMetricOverviewChart data={data} />
            }
            return <WidgetPredefinedChart metric={metric} data={data} predefinedKey={metric.predefinedKey} />
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
            if (viewType === 'table') {
                return <CustomMetricTable  metric={metric} data={data[0]} />;
            } else if (viewType === 'pieChart') {
                return (
                    <CustomMetricPieChart
                        metric={metric}
                        data={data[0]}
                        colors={colors}
                        params={params}
                    />
                )
            }
        }

        return <div>Unknown</div>;
    }
    return useObserver(() => (
        <Loader loading={loading}>
            {renderChart()}
        </Loader>
    ));
}

export default WidgetChart;
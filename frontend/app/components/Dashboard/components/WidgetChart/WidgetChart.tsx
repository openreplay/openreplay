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
interface Props {
    metric: any;
    isWidget?: boolean
}
function WidgetChart(props: Props) {
    const { isWidget = false, metric } = props;
    const { dashboardStore } = useStore();
    const period = useObserver(() => dashboardStore.period);
    const colors = Styles.customMetricColors;
    const [loading, setLoading] = useState(false)
    const [seriesMap, setSeriesMap] = useState<any>([]);
    const params = { density: 28 } 
    const metricParams = { ...params }
    const prevMetricRef = useRef<any>();
    const [data, setData] = useState<any>(metric.data);

    useEffect(() => {
        if (prevMetricRef.current && prevMetricRef.current.name !== metric.name) {
          prevMetricRef.current = metric;
          return
        };
        prevMetricRef.current = metric;
        
        setLoading(true);
        const data = isWidget ? { ...params } : { ...metricParams, ...metric.toJson() };
        dashboardStore.fetchMetricChartData(metric, data, isWidget).then((res: any) => {
            setData(res);
        }).finally(() => {
            setLoading(false);
        });
    }, [period]);

    const renderChart = () => {
        const { metricType, viewType, predefinedKey } = metric;

        if (metricType === 'predefined') {
            if (viewType === 'overview') {
                return <CustomMetricOverviewChart data={data} />
            }
            return <WidgetPredefinedChart data={data} predefinedKey={metric.predefinedKey} />
        }

        if (metricType === 'timeseries') {
            if (viewType === 'lineChart') {
                return (
                    <CustomMetriLineChart
                        data={metric.data}
                        seriesMap={seriesMap}
                        colors={colors}
                        params={params}
                    />
                )
            } else if (viewType === 'progress') {
                return (
                    <CustomMetricPercentage
                        data={metric.data[0]}
                        colors={colors}
                        params={params}
                    />
                )
            }
        }

        if (metricType === 'table') {
            if (viewType === 'table') {
                return <CustomMetricTable  metric={metric} data={metric.data[0]} />;
            } else if (viewType === 'pieChart') {
                return (
                    <CustomMetricPieChart
                        metric={metric}
                        data={metric.data[0]}
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
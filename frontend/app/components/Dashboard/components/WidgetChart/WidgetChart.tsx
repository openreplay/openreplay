import React, { useState, useRef, useEffect } from 'react';
import Period, { LAST_24_HOURS, LAST_30_MINUTES, YESTERDAY, LAST_7_DAYS } from 'Types/app/period';
import CustomMetriLineChart from '../../Widgets/CustomMetricsWidgets/CustomMetriLineChart';
import CustomMetricPercentage from '../../Widgets/CustomMetricsWidgets/CustomMetricPercentage';
import CustomMetricTable from '../../Widgets/CustomMetricsWidgets/CustomMetricTable';
import CustomMetricPieChart from '../../Widgets/CustomMetricsWidgets/CustomMetricPieChart';
import APIClient from 'App/api_client';
import { Styles } from '../../Widgets/common';
import { getChartFormatter } from 'Types/dashboard/helper'; 
import { observer, useObserver } from 'mobx-react-lite';
import { Loader } from 'UI';
import { useStore } from 'App/mstore';
interface Props {
    metric: any;
}
function WidgetChart(props: Props) {
    const metric = useObserver(() => props.metric);
    const { metricStore } = useStore();
    // const metric: any = useObserver(() => metricStore.instance);
    const series = useObserver(() => metric.series);
    const colors = Styles.customMetricColors;
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState<any>({ chart: [{}] })
    const [seriesMap, setSeriesMap] = useState<any>([]);
    const [period, setPeriod] = useState(Period({ rangeName: metric.rangeName, startDate: metric.startDate, endDate: metric.endDate }));
    const params = { density: 70 } 
    const metricParams = { ...params, metricId: metric.metricId, viewType: 'lineChart' }
    const prevMetricRef = useRef<any>();

    useEffect(() => {
        // Check for title change
        if (prevMetricRef.current && prevMetricRef.current.name !== metric.name) {
          prevMetricRef.current = metric;
          return
        };
        prevMetricRef.current = metric;
        setLoading(true);
        
        // fetch new data for the widget preview
        new APIClient()['post']('/custom_metrics/try', { ...metricParams, ...metric.toJson() })
          .then(response => response.json())
          .then(({ errors, data }) => {
            if (errors) {
              console.log('err', errors)
            } else {
              const namesMap = data
                .map(i => Object.keys(i))
                .flat()
                .filter(i => i !== 'time' && i !== 'timestamp')
                .reduce((unique: any, item: any) => {
                  if (!unique.includes(item)) {
                    unique.push(item);
                  }
                  return unique;
                }, []);
    
              setSeriesMap(namesMap);
              setData(getChartFormatter(period)(data));
            }
          }).finally(() => setLoading(false));
    }, [metric.data]);

    const renderChart = () => {
        const { metricType, viewType } = metric;
        if (metricType === 'timeseries') {
            if (viewType === 'lineChart') {
                return (
                    <CustomMetriLineChart
                        data={data}
                        seriesMap={seriesMap}
                        colors={colors}
                        params={params}
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
    return (
        <Loader loading={loading}>
            {renderChart()}
        </Loader>
    );
}

export default observer(WidgetChart);
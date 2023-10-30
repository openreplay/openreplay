import React, { useState, useRef, useEffect } from 'react';
import CustomMetriLineChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetriLineChart';
import CustomMetricPercentage from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPercentage';
import CustomMetricTable from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTable';
import CustomMetricPieChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPieChart';
import { Styles } from 'App/components/Dashboard/Widgets/common';
import { observer } from 'mobx-react-lite';
import { Loader } from 'UI';
import { useStore } from 'App/mstore';
import WidgetPredefinedChart from '../WidgetPredefinedChart';
import CustomMetricOverviewChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricOverviewChart';
import { getStartAndEndTimestampsByDensity } from 'Types/dashboard/helper';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import { FilterKey } from 'Types/filter/filterType';
import {
  TIMESERIES,
  TABLE,
  CLICKMAP,
  FUNNEL,
  ERRORS,
  PERFORMANCE,
  RESOURCE_MONITORING,
  WEB_VITALS,
  INSIGHTS,
  USER_PATH,
  RETENTION
} from 'App/constants/card';
import FunnelWidget from 'App/components/Funnels/FunnelWidget';
import SessionWidget from '../Sessions/SessionWidget';
import CustomMetricTableSessions from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableSessions';
import CustomMetricTableErrors from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableErrors';
import ClickMapCard from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard';
import InsightsCard from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/InsightsCard';
import SankeyChart from 'Shared/Insights/SankeyChart';
import CohortCard from '../../Widgets/CustomMetricsWidgets/CohortCard';

interface Props {
  metric: any;
  isWidget?: boolean;
  isTemplate?: boolean;
  isPreview?: boolean;
}

function WidgetChart(props: Props) {
  const { isWidget = false, metric, isTemplate } = props;
  const { dashboardStore, metricStore, sessionStore } = useStore();
  const _metric: any = metricStore.instance;
  const period = dashboardStore.period;
  const drillDownPeriod = dashboardStore.drillDownPeriod;
  const drillDownFilter = dashboardStore.drillDownFilter;
  const colors = Styles.customMetricColors;
  const [loading, setLoading] = useState(true);
  const isOverviewWidget = metric.metricType === WEB_VITALS;
  const params = { density: isOverviewWidget ? 7 : 70 };
  const metricParams = { ...params };
  const prevMetricRef = useRef<any>();
  const isMounted = useIsMounted();
  const [data, setData] = useState<any>(metric.data);

  const isTableWidget = metric.metricType === 'table' && metric.viewType === 'table';
  const isPieChart = metric.metricType === 'table' && metric.viewType === 'pieChart';

  useEffect(() => {
    return () => {
      dashboardStore.resetDrillDownFilter();
    };
  }, []);

  const onChartClick = (event: any) => {
    if (event) {
      if (isTableWidget || isPieChart) { // get the filter of clicked row
        const periodTimestamps = drillDownPeriod.toTimestamps();
        drillDownFilter.merge({
          filters: event,
          startTimestamp: periodTimestamps.startTimestamp,
          endTimestamp: periodTimestamps.endTimestamp
        });
      } else { // get the filter of clicked chart point
        const payload = event.activePayload[0].payload;
        const timestamp = payload.timestamp;
        const periodTimestamps = getStartAndEndTimestampsByDensity(timestamp, drillDownPeriod.start, drillDownPeriod.end, params.density);

        drillDownFilter.merge({
          startTimestamp: periodTimestamps.startTimestamp,
          endTimestamp: periodTimestamps.endTimestamp
        });
      }
    }
  };

  const depsString = JSON.stringify({
    ..._metric.series, ..._metric.excludes, ..._metric.startPoint,
    hideExcess: _metric.hideExcess
  });
  const fetchMetricChartData = (metric: any, payload: any, isWidget: any, period: any) => {
    if (!isMounted()) return;
    setLoading(true);
    dashboardStore.fetchMetricChartData(metric, payload, isWidget, period).then((res: any) => {
      if (isMounted()) setData(res);
    }).finally(() => {
      setLoading(false);
    });
  };

  const debounceRequest: any = React.useCallback(debounce(fetchMetricChartData, 500), []);
  const loadPage = () => {
    if (prevMetricRef.current && prevMetricRef.current.name !== metric.name) {
      prevMetricRef.current = metric;
      return;
    }
    prevMetricRef.current = metric;
    const timestmaps = drillDownPeriod.toTimestamps();
    const payload = isWidget ? { ...params } : { ...metricParams, ...timestmaps, ...metric.toJson() };
    debounceRequest(metric, payload, isWidget, !isWidget ? drillDownPeriod : period);
  };
  useEffect(() => {
    _metric.updateKey('page', 1);
    loadPage();
  }, [drillDownPeriod, period, depsString, metric.metricType, metric.metricOf, metric.viewType, metric.metricValue, metric.startType]);
  useEffect(loadPage, [_metric.page]);


  const renderChart = () => {
    const { metricType, viewType, metricOf } = metric;
    const metricWithData = { ...metric, data };

    if (metricType === FUNNEL) {
      return <FunnelWidget metric={metric} data={data} isWidget={isWidget || isTemplate} />;
    }

    if (metricType === 'predefined' || metricType === ERRORS || metricType === PERFORMANCE || metricType === RESOURCE_MONITORING || metricType === WEB_VITALS) {
      const defaultMetric = metric.data.chart && metric.data.chart.length === 0 ? metricWithData : metric;
      if (isOverviewWidget) {
        return <CustomMetricOverviewChart data={data} />;
      }
      return <WidgetPredefinedChart isTemplate={isTemplate} metric={defaultMetric} data={data}
                                    predefinedKey={metric.metricOf} />;
    }

    if (metricType === TIMESERIES) {
      if (viewType === 'lineChart') {
        return (
          <CustomMetriLineChart
            data={data}
            colors={colors}
            params={params}
            onClick={onChartClick}
          />
        );
      } else if (viewType === 'progress') {
        return (
          <CustomMetricPercentage
            data={data[0]}
            colors={colors}
            params={params}
          />
        );
      }
    }

    if (metricType === TABLE) {
      if (metricOf === FilterKey.SESSIONS) {
        return (
          <CustomMetricTableSessions
            metric={metric}
            data={data}
            isTemplate={isTemplate}
            isEdit={!isWidget && !isTemplate}
          />
        );
      }
      if (metricOf === FilterKey.ERRORS) {
        return (
          <CustomMetricTableErrors
            metric={metric}
            data={data}
            // isTemplate={isTemplate}
            isEdit={!isWidget && !isTemplate}
          />
        );
      }
      if (viewType === TABLE) {
        return (
          <CustomMetricTable
            metric={metric} data={data[0]}
            onClick={onChartClick}
            isTemplate={isTemplate}
          />
        );
      } else if (viewType === 'pieChart') {
        return (
          <CustomMetricPieChart
            metric={metric}
            data={data[0]}
            colors={colors}
            // params={params}
            onClick={onChartClick}
          />
        );
      }
    }
    if (metricType === CLICKMAP) {
      if (!props.isPreview) {
        return (
          <div style={{ height: '229px', overflow: 'hidden', marginBottom: '10px' }}>
            <img src={metric.thumbnail} alt='clickmap thumbnail' />
          </div>
        );
      }
      return (
        <ClickMapCard />
      );
    }

    if (metricType === INSIGHTS) {
      return <InsightsCard data={data} />;
    }

    if (metricType === USER_PATH && data && data.links) {
      return <SankeyChart
        height={props.isPreview ? 500 : 240}
        data={data}
        onChartClick={(filters: any) => {
          dashboardStore.drillDownFilter.merge({ filters, page: 1 });
        }} />;
    }

    if (metricType === RETENTION) {
      if (viewType === 'trend') {
        return (
          <CustomMetriLineChart
            data={data}
            colors={colors}
            params={params}
            onClick={onChartClick}
          />
        );
      } else if (viewType === 'cohort') {
        return (
          <CohortCard data={data[0]} />
        );
      }
    }

    return <div>Unknown metric type</div>;
  };
  return (
    <Loader loading={loading} style={{ height: `${isOverviewWidget ? 100 : 240}px` }}>
      <div style={{ minHeight: isOverviewWidget ? 100 : 240 }}>{renderChart()}</div>
    </Loader>
  );
}

export default observer(WidgetChart);

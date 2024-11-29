import React, { useState, useRef, useEffect } from 'react';
import CustomMetricLineChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricLineChart';
import CustomMetricPercentage from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPercentage';
import CustomMetricPieChart from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPieChart';
import { Styles } from 'App/components/Dashboard/Widgets/common';
import { observer } from 'mobx-react-lite';
import { Icon, Loader } from 'UI';
import { useStore } from 'App/mstore';
import AreaChart from '../../Widgets/CustomMetricsWidgets/AreaChart';
import BarChart from '../../Widgets/CustomMetricsWidgets/BarChart';
import ProgressBarChart from '../../Widgets/CustomMetricsWidgets/ProgressBarChart';
import BugNumChart from '../../Widgets/CustomMetricsWidgets/BigNumChart'
import WidgetDatatable from '../WidgetDatatable/WidgetDatatable';
import WidgetPredefinedChart from '../WidgetPredefinedChart';
import { getStartAndEndTimestampsByDensity } from 'Types/dashboard/helper';
import { debounce } from 'App/utils';
import useIsMounted from 'App/hooks/useIsMounted';
import { FilterKey } from 'Types/filter/filterType';
import {
  TIMESERIES,
  TABLE,
  HEATMAP,
  FUNNEL,
  ERRORS,
  INSIGHTS,
  USER_PATH,
  RETENTION,
} from 'App/constants/card';
import FunnelWidget from 'App/components/Funnels/FunnelWidget';
import CustomMetricTableSessions from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableSessions';
import CustomMetricTableErrors from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableErrors';
import ClickMapCard from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard';
import InsightsCard from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/InsightsCard';
import SankeyChart from 'Shared/Insights/SankeyChart';
import CohortCard from '../../Widgets/CustomMetricsWidgets/CohortCard';
import SessionsBy from 'Components/Dashboard/Widgets/CustomMetricsWidgets/SessionsBy';
import { useInView } from 'react-intersection-observer';

interface Props {
  metric: any;
  isSaved?: boolean;
  isTemplate?: boolean;
  isPreview?: boolean;
}

function WidgetChart(props: Props) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });
  const { isSaved = false, metric, isTemplate } = props;
  const { dashboardStore, metricStore, sessionStore } = useStore();
  const _metric: any = metricStore.instance;
  const period = dashboardStore.period;
  const drillDownPeriod = dashboardStore.drillDownPeriod;
  const drillDownFilter = dashboardStore.drillDownFilter;
  const colors = Styles.customMetricColors;
  const [loading, setLoading] = useState(true);
  const params = { density: dashboardStore.selectedDensity }
  const metricParams = _metric.params;
  const prevMetricRef = useRef<any>();
  const isMounted = useIsMounted();
  const [data, setData] = useState<any>(metric.data);
  const [compData, setCompData] = useState<any>(null);
  const [enabledRows, setEnabledRows] = useState([]);
  const isTableWidget =
    metric.metricType === 'table' && metric.viewType === 'table';
  const isPieChart =
    metric.metricType === 'table' && metric.viewType === 'pieChart';

  useEffect(() => {
    return () => {
      dashboardStore.resetDrillDownFilter();
    };
  }, []);

  useEffect(() => {
    const series = data.chart[0] ? Object.keys(data.chart[0]).filter(
      (key) => key !== 'time' && key !== 'timestamp'
    ) : []
    if (series.length) {
      setEnabledRows(series)
    }
  }, [data.chart.length])

  const onChartClick = (event: any) => {
    if (event) {
      if (isTableWidget || isPieChart) {
        // get the filter of clicked row
        const periodTimestamps = drillDownPeriod.toTimestamps();
        drillDownFilter.merge({
          filters: event,
          startTimestamp: periodTimestamps.startTimestamp,
          endTimestamp: periodTimestamps.endTimestamp,
        });
      } else {
        // get the filter of clicked chart point
        const payload = event.activePayload[0].payload;
        const timestamp = payload.timestamp;
        const periodTimestamps = getStartAndEndTimestampsByDensity(
          timestamp,
          drillDownPeriod.start,
          drillDownPeriod.end,
          params.density
        );

        drillDownFilter.merge({
          startTimestamp: periodTimestamps.startTimestamp,
          endTimestamp: periodTimestamps.endTimestamp,
        });
      }
    }
  };

  const depsString = JSON.stringify({
    ..._metric.series,
    ..._metric.excludes,
    ..._metric.startPoint,
    hideExcess: _metric.hideExcess,
  });
  const fetchMetricChartData = (
    metric: any,
    payload: any,
    isSaved: any,
    period: any,
    isComparison?: boolean
  ) => {
    if (!isMounted()) return;
    setLoading(true);
    dashboardStore
      .fetchMetricChartData(metric, payload, isSaved, period, isComparison)
      .then((res: any) => {
        if (isMounted()) {
          if (isComparison) setCompData(res)
          else setData(res);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const debounceRequest: any = React.useCallback(
    debounce(fetchMetricChartData, 500),
    []
  );
  const loadPage = () => {
    if (!inView) return;
    if (prevMetricRef.current && prevMetricRef.current.name !== metric.name) {
      prevMetricRef.current = metric;
      return;
    }
    prevMetricRef.current = metric;
    const timestmaps = drillDownPeriod.toTimestamps();
    const payload = isSaved
      ? { ...metricParams }
      : { ...params, ...timestmaps, ...metric.toJson() };
    debounceRequest(
      metric,
      payload,
      isSaved,
      !isSaved ? drillDownPeriod : period
    );
  };
  const loadComparisonData = () => {
    if (!inView) return;
    if (!dashboardStore.comparisonPeriod) return setCompData(null);

    const timestamps = dashboardStore.comparisonPeriod.toTimestamps();
    const payload = { ...params, ...timestamps, ...metric.toJson() };
    fetchMetricChartData(metric, payload, isSaved, dashboardStore.comparisonPeriod, true);
  }
  useEffect(() => {
    loadComparisonData();
  }, [dashboardStore.comparisonPeriod])
  useEffect(() => {
    _metric.updateKey('page', 1);
    loadPage();
  }, [
    drillDownPeriod,
    period,
    depsString,
    dashboardStore.selectedDensity,
    metric.metricType,
    metric.metricOf,
    metric.metricValue,
    metric.startType,
    metric.metricFormat,
    inView,
  ]);
  useEffect(loadPage, [_metric.page]);

  const renderChart = () => {
    const { metricType, metricOf } = metric;
    const viewType = metric.viewType;
    const metricWithData = { ...metric, data };

    if (metricType === FUNNEL) {
      return (
        <FunnelWidget
          metric={metric}
          data={data}
          isWidget={isSaved || isTemplate}
        />
      );
    }

    if (metricType === 'predefined' || metricType === ERRORS) {
      const defaultMetric =
        metric.data.chart && metric.data.chart.length === 0
          ? metricWithData
          : metric;
      return (
        <WidgetPredefinedChart
          isTemplate={isTemplate}
          metric={defaultMetric}
          data={data}
          predefinedKey={metric.metricOf}
        />
      );
    }

    if (metricType === TIMESERIES) {
      const chartData = { ...data };
      chartData.namesMap = Array.isArray(chartData.namesMap) ? chartData.namesMap.map(n => enabledRows.includes(n) ? n : null) : chartData.namesMap
      if (viewType === 'lineChart') {
        return (
          <CustomMetricLineChart
            data={chartData}
            compData={compData}
            colors={colors}
            params={params}
            onClick={onChartClick}
            label={
              metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
        );
      }
      if (viewType === 'areaChart') {
        return (
          <AreaChart
            data={chartData}
            params={params}
            colors={colors}
            onClick={onChartClick}
            label={
              metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
        );
      }
      if (viewType === 'barChart') {
        return (
          <BarChart
            data={chartData}
            compData={compData}
            params={params}
            colors={colors}
            onClick={onChartClick}
            label={
              metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
        );
      }
      if (viewType === 'progressChart') {
        return (
          <ProgressBarChart
            data={chartData}
            compData={compData}
            params={params}
            colors={colors}
            onClick={onChartClick}
            label={
              metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
        );
      }
      if (viewType === 'pieChart') {
        return (
          <CustomMetricPieChart
            metric={metric}
            data={chartData}
            colors={colors}
            onClick={onChartClick}
            label={
              metric.metricOf === 'sessionCount'
              ? 'Number of Sessions'
              : 'Number of Users'
            }
          />
        );
      }
      if (viewType === 'progress') {
        return (
          <CustomMetricPercentage
            data={data[0]}
            colors={colors}
            params={params}
            label={
              metric.metricOf === 'sessionCount'
              ? 'Number of Sessions'
              : 'Number of Users'
            }
          />
        );
      }
      if (viewType === 'table') {
        return null;
      }
      if (viewType === 'metric') {
        return (
          <BugNumChart
            data={data}
            compData={compData}
            colors={colors}
            onClick={onChartClick}
            label={
              metric.metricOf === 'sessionCount'
              ? 'Number of Sessions'
              : 'Number of Users'
            }
          />
        )
      }
    }

    if (metricType === TABLE) {
      if (metricOf === FilterKey.SESSIONS) {
        return (
          <CustomMetricTableSessions
            metric={metric}
            data={data}
            isTemplate={isTemplate}
            isEdit={!isSaved && !isTemplate}
          />
        );
      }
      if (metricOf === FilterKey.ERRORS) {
        return (
          <CustomMetricTableErrors
            metric={metric}
            data={data}
            // isTemplate={isTemplate}
            isEdit={!isSaved && !isTemplate}
          />
        );
      }
      if (viewType === TABLE) {
        return (
          <SessionsBy
            metric={metric}
            data={data[0]}
            onClick={onChartClick}
            isTemplate={isTemplate}
          />
        );
      }
    }
    if (metricType === HEATMAP) {
      if (!props.isPreview) {
        return metric.thumbnail ? (
          <div
            style={{
              height: '229px',
              overflow: 'hidden',
              marginBottom: '10px',
            }}
          >
            <img src={metric.thumbnail} alt="clickmap thumbnail" />
          </div>
        ) : (
          <div
            className="flex items-center relative justify-center"
            style={{ height: '229px' }}
          >
            <Icon name="info-circle" className="mr-2" size="14" />
            No data available for the selected period.
          </div>
        );
      }
      return <ClickMapCard />;
    }

    if (metricType === INSIGHTS) {
      return <InsightsCard data={data} />;
    }

    if (metricType === USER_PATH && data && data.links) {
      // return <PathAnalysis data={data}/>;
      return (
        <SankeyChart
          height={props.isPreview ? 500 : 240}
          data={data}
          onChartClick={(filters: any) => {
            dashboardStore.drillDownFilter.merge({ filters, page: 1 });
          }}
        />
      );
    }

    if (metricType === RETENTION) {
      if (viewType === 'trend') {
        return (
          <CustomMetricLineChart
            data={data}
            colors={colors}
            params={params}
            onClick={onChartClick}
          />
        );
      } else if (viewType === 'cohort') {
        return <CohortCard data={data[0]} />;
      }
    }

    return <div>Unknown metric type</div>;
  };
  return (
    <div ref={ref}>
      <Loader loading={loading} style={{ height: `240px` }}>
        <div style={{ minHeight: 240 }}>
          {renderChart()}
          {metric.metricType === TIMESERIES ? (
            <WidgetDatatable data={data} enabledRows={enabledRows} setEnabledRows={setEnabledRows} />
          ) : null}
        </div>
      </Loader>
    </div>
  );
}

export default observer(WidgetChart);

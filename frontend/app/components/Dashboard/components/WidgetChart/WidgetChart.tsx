import React, { useState, useRef, useEffect } from 'react';
import LineChart from 'App/components/Charts/LineChart'
import BarChart from 'App/components/Charts/BarChart'
import PieChart from 'App/components/Charts/PieChart'
import ColumnChart from 'App/components/Charts/ColumnChart'
import CustomMetricPercentage from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPercentage';
import { Styles } from 'App/components/Dashboard/Widgets/common';
import { observer } from 'mobx-react-lite';
import { Icon, Loader } from 'UI';
import { useStore } from 'App/mstore';
import FunnelTable from "../../../Funnels/FunnelWidget/FunnelTable";
import BugNumChart from '../../Widgets/CustomMetricsWidgets/BigNumChart';
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
import { filterMinorPaths } from 'Shared/Insights/SankeyChart/utils'
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
  const { dashboardStore, metricStore } = useStore();
  const _metric: any = props.isPreview ? metricStore.instance : props.metric;
  const data = _metric.data;
  const period = dashboardStore.period;
  const drillDownPeriod = dashboardStore.drillDownPeriod;
  const drillDownFilter = dashboardStore.drillDownFilter;
  const colors = Styles.safeColors;
  const [loading, setLoading] = useState(true);
  const params = { density: dashboardStore.selectedDensity };
  const metricParams = _metric.params;
  const prevMetricRef = useRef<any>();
  const isMounted = useIsMounted();
  const [compData, setCompData] = useState<any>(null);
  const [enabledRows, setEnabledRows] = useState<string[]>([]);
  const isTableWidget =
    _metric.metricType === 'table' && _metric.viewType === 'table';
  const isPieChart =
    _metric.metricType === 'table' && _metric.viewType === 'pieChart';

  useEffect(() => {
    return () => {
      dashboardStore.setComparisonPeriod(null, _metric.metricId);
      dashboardStore.resetDrillDownFilter();
    };
  }, []);

  useEffect(() => {
    if (!data.chart) return;
    const series = data.chart[0]
      ? Object.keys(data.chart[0]).filter(
          (key) => key !== 'time' && key !== 'timestamp'
        )
      : [];
    if (series.length) {
      setEnabledRows(series);
    }
  }, [data.chart]);

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
    hideExcess: false,
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
        if (isComparison) setCompData(res);
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
    if (prevMetricRef.current && prevMetricRef.current.name !== _metric.name) {
      prevMetricRef.current = _metric;
      return;
    }
    prevMetricRef.current = _metric;
    const timestmaps = drillDownPeriod.toTimestamps();
    const payload = isSaved
      ? { ...metricParams }
      : { ...params, ...timestmaps, ..._metric.toJson() };
    debounceRequest(
      _metric,
      payload,
      isSaved,
      !isSaved ? drillDownPeriod : period
    );
  };

  const loadComparisonData = () => {
    if (!dashboardStore.comparisonPeriods[_metric.metricId]) return setCompData(null);

    // TODO: remove after backend adds support for more view types
    const payload = {
      ...params,
      ..._metric.toJson(),
      viewType: 'lineChart',
    };
    fetchMetricChartData(
      _metric,
      payload,
      isSaved,
      dashboardStore.comparisonPeriods[_metric.metricId],
      true
    );
  };
  useEffect(() => {
    if (!inView || !props.isPreview) return;
    loadComparisonData();
  }, [
    dashboardStore.comparisonPeriods[_metric.metricId],
    _metric.metricId,
    inView,
    props.isPreview,
    drillDownPeriod,
    period,
    depsString,
    dashboardStore.selectedDensity,
  ]);
  useEffect(() => {
    setCompData(null);
    _metric.updateKey('page', 1);
    _metric.updateKey()
    loadPage();
  }, [
    drillDownPeriod,
    period,
    depsString,
    dashboardStore.selectedDensity,
    _metric.metricType,
    _metric.metricOf,
    _metric.metricValue,
    _metric.startType,
    _metric.metricFormat,
    inView,
  ]);
  useEffect(loadPage, [_metric.page]);

  const onFocus = (seriesName: string)=> {
    metricStore.setFocusedSeriesName(seriesName);
  }

  const renderChart = React.useCallback(() => {
    const { metricType, metricOf } = _metric;
    const viewType = _metric.viewType;
    const metricWithData = { ..._metric, data };

    if (metricType === FUNNEL) {
      if (viewType === 'table') {
        return (
          <FunnelTable data={data} compData={compData} />
        )
      }
      if (viewType === 'metric') {
        const values: {
          value: number;
          compData?: number;
          series: string;
          valueLabel?: string;
        }[] = [
          {
            value: data.funnel.totalConversionsPercentage,
            compData: compData
              ? compData.funnel.totalConversionsPercentage
              : undefined,
            series: 'Dynamic',
            valueLabel: '%'
          },
        ];

        return (
          <BugNumChart
            values={values}
            inGrid={!props.isPreview}
            colors={colors}
            onClick={onChartClick}
            label={
              'Conversion'
            }
          />
        );
      }

      return (
        <FunnelWidget
          metric={_metric}
          data={data}
          compData={compData}
          isWidget={isSaved || isTemplate}
        />
      );
    }

    if (metricType === 'predefined' || metricType === ERRORS) {
      const defaultMetric =
        _metric.data.chart && _metric.data.chart.length === 0
          ? metricWithData
          : metric;
      return (
        <WidgetPredefinedChart
          isTemplate={isTemplate}
          metric={defaultMetric}
          data={data}
          predefinedKey={_metric.metricOf}
        />
      );
    }

    if (metricType === TIMESERIES) {
      const chartData = { ...data };
      chartData.namesMap = Array.isArray(chartData.namesMap)
        ? chartData.namesMap.map((n) => (enabledRows.includes(n) ? n : null))
        : chartData.namesMap;
      const compDataCopy = { ...compData };
      compDataCopy.namesMap = Array.isArray(compDataCopy.namesMap)
        ? compDataCopy.namesMap.map((n) =>
            enabledRows.includes(n) ? n : null
          )
        : compDataCopy.namesMap;

      if (viewType === 'lineChart') {
        return (
          <div className='pt-3'>
          <LineChart
            chartName={_metric.name}
            inGrid={!props.isPreview}
            data={chartData}
            compData={compDataCopy}
            onClick={onChartClick}
            label={
              _metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
          </div>
        );
      }
      if (viewType === 'areaChart') {
        return (
          <div className='pt-3'>
          <LineChart
            isArea
            chartName={_metric.name}
            data={chartData}
            inGrid={!props.isPreview}
            onClick={onChartClick}
            label={
              _metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
          </div>
        );
      }
      if (viewType === 'barChart') {
        return (
          <div className='pt-3'>
          <BarChart
            inGrid={!props.isPreview}
            data={chartData}
            compData={compDataCopy}
            params={params}
            colors={colors}
            onClick={onChartClick}
            label={
              _metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
          </div>
        );
      }
     
      if (viewType === 'progressChart') {
        return (
          <ColumnChart
            inGrid={!props.isPreview}
            horizontal
            data={chartData}
            compData={compDataCopy}
            params={params}
            colors={colors}
            onSeriesFocus={onFocus}
            label={
              _metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
        );
      }
      if (viewType === 'pieChart') {
        return (
          <div className='pt-3'>
          <PieChart
            inGrid={!props.isPreview}
            data={chartData}
            onSeriesFocus={onFocus}
            label={
              _metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
          </div>
        );
      }
      if (viewType === 'progress') {
        return (
          <CustomMetricPercentage
            inGrid={!props.isPreview}
            data={data[0]}
            colors={colors}
            params={params}
            label={
              _metric.metricOf === 'sessionCount'
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
        const values: { value: number, compData?: number, series: string }[] = [];
        for (let i = 0; i < data.namesMap.length; i++) {
          if (!data.namesMap[i]) {
            continue;
          }

          values.push({
            value: data.chart.reduce((acc, curr) => acc + curr[data.namesMap[i]], 0),
            compData: compData ? compData.chart.reduce((acc, curr) => acc + curr[compData.namesMap[i]], 0) : undefined,
            series: data.namesMap[i],
          });
        }

        return (
          <BugNumChart
            values={values}
            inGrid={!props.isPreview}
            colors={colors}
            onSeriesFocus={onFocus}
            label={
              _metric.metricOf === 'sessionCount'
                ? 'Number of Sessions'
                : 'Number of Users'
            }
          />
        );
      }
    }

    if (metricType === TABLE) {
      if (metricOf === FilterKey.SESSIONS) {
        return (
          <CustomMetricTableSessions
            metric={_metric}
            data={data}
            isTemplate={isTemplate}
            isEdit={!isSaved && !isTemplate}
          />
        );
      }
      if (metricOf === FilterKey.ERRORS) {
        return (
          <CustomMetricTableErrors
            metric={_metric}
            data={data}
            // isTemplate={isTemplate}
            isEdit={!isSaved && !isTemplate}
          />
        );
      }
      if (viewType === TABLE) {
        return (
          <SessionsBy
            metric={_metric}
            data={data}
            onClick={onChartClick}
            isTemplate={isTemplate}
          />
        );
      }
    }
    if (metricType === HEATMAP) {
      if (!props.isPreview) {
        return _metric.thumbnail ? (
          <div
            style={{
              height: '229px',
              overflow: 'hidden',
              marginBottom: '10px',
            }}
          >
            <img src={_metric.thumbnail} alt="clickmap thumbnail" />
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
      const usedData = _metric.hideExcess ? filterMinorPaths(data) : data;
      return (
        <SankeyChart
          height={props.isPreview ? 500 : 240}
          data={usedData}
          iterations={_metric.hideExcess ? 0 : 128}
          onChartClick={(filters: any) => {
            dashboardStore.drillDownFilter.merge({ filters, page: 1 });
          }}
        />
      );
    }

    if (metricType === RETENTION) {
      if (viewType === 'trend') {
        return (
          <LineChart
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
  }, [data, compData, enabledRows, _metric]);


  const showTable = _metric.metricType === TIMESERIES && (props.isPreview || _metric.viewType === TABLE)
  return (
    <div ref={ref}>
      <Loader loading={loading} style={{ height: `240px` }}>
        <div style={{ minHeight: props.isPreview ? undefined : 240 }}>
          {renderChart()}
          {showTable ? (
            <WidgetDatatable
              compData={compData}
              inBuilder={props.isPreview}
              defaultOpen={true}
              data={data}
              enabledRows={enabledRows}
              setEnabledRows={setEnabledRows}
              metric={_metric}
            />
          ) : null}
        </div>
      </Loader>
    </div>
  );
}

export default observer(WidgetChart);

import React, { useState, useRef, useEffect } from 'react';
import LineChart from 'App/components/Charts/LineChart';
import BarChart from 'App/components/Charts/BarChart';
import PieChart from 'App/components/Charts/PieChart';
import ColumnChart from 'App/components/Charts/ColumnChart';
import SankeyChart from 'Components/Charts/SankeyChart';

import CustomMetricPercentage from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPercentage';
import { Styles } from 'App/components/Dashboard/Widgets/common';
import { observer } from 'mobx-react-lite';
import { Icon, Loader } from 'UI';
import { useStore } from 'App/mstore';
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
import SessionsBy from 'Components/Dashboard/Widgets/CustomMetricsWidgets/SessionsBy';
import { useInView } from 'react-intersection-observer';
import CohortCard from '../../Widgets/CustomMetricsWidgets/CohortCard';
import WidgetPredefinedChart from '../WidgetPredefinedChart';
import WidgetDatatable from '../WidgetDatatable/WidgetDatatable';
import BugNumChart from '../../Widgets/CustomMetricsWidgets/BigNumChart';
import FunnelTable from '../../../Funnels/FunnelWidget/FunnelTable';
import LongLoader from './LongLoader';
import { useTranslation } from 'react-i18next';

interface Props {
  metric: any;
  isSaved?: boolean;
  isTemplate?: boolean;
  isPreview?: boolean;
}

function WidgetChart(props: Props) {
  const { t } = useTranslation();
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });
  const { isSaved = false, metric, isTemplate } = props;
  const { dashboardStore, metricStore } = useStore();
  const _metric: any = props.isPreview ? metricStore.instance : props.metric;
  const [data, setData] = useState(_metric.data ?? { chart: [] });
  const { period } = dashboardStore;
  const { drillDownPeriod } = dashboardStore;
  const { drillDownFilter } = dashboardStore;
  const colors = Styles.safeColors;
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const params = { density: dashboardStore.selectedDensity };
  const metricParams = _metric.params;
  const prevMetricRef = useRef<any>();
  const isMounted = useIsMounted();
  const [compData, setCompData] = useState<any>(null);
  const [enabledRows, setEnabledRows] = useState<string[]>(
    _metric.series.map((s) => s.name),
  );
  const isTableWidget =
    _metric.metricType === 'table' && _metric.viewType === 'table';
  const isPieChart =
    _metric.metricType === 'table' && _metric.viewType === 'pieChart';

  useEffect(
    () => () => {
      dashboardStore.setComparisonPeriod(null, _metric.metricId);
      dashboardStore.resetDrillDownFilter();
    },
    [],
  );

  useEffect(() => {
    if (enabledRows.length !== _metric.series.length) {
      const excluded = _metric.series
        .filter((s) => !enabledRows.includes(s.name))
        .map((s) => s.name);
      metricStore.setDisabledSeries(excluded);
    } else {
      metricStore.setDisabledSeries([]);
    }
  }, [enabledRows]);

  useEffect(() => {
    if (!data.chart) return;
    const series = data.chart[0]
      ? Object.keys(data.chart[0]).filter(
          (key) => key !== 'time' && key !== 'timestamp',
        )
      : [];
    if (series.length) {
      setEnabledRows(series);
    }
  }, [data.chart]);

  const onChartClick = (event: any) => {
    metricStore.setDrillDown(true);
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
        const { payload } = event.activePayload[0];
        const { timestamp } = payload;
        const periodTimestamps = getStartAndEndTimestampsByDensity(
          timestamp,
          drillDownPeriod.start,
          drillDownPeriod.end,
          params.density,
        );

        drillDownFilter.merge({
          startTimestamp: periodTimestamps.startTimestamp,
          endTimestamp: periodTimestamps.endTimestamp,
        });
      }
    }
  };

  const loadSample = () => console.log('clicked');

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
    isComparison?: boolean,
  ) => {
    if (!isMounted()) return;
    setLoading(true);
    const tm = setTimeout(() => {
      setStale(true);
    }, 4000);
    dashboardStore
      .fetchMetricChartData(metric, payload, isSaved, period, isComparison)
      .then((res) => {
        if (isComparison) {
          setCompData(res);
        } else {
          setData(res);
        }
        clearTimeout(tm);
        setStale(false);
      })
      .finally(() => {
        if (metric.metricId === 1014) return;
        setLoading(false);
      });
  };

  const debounceRequest: any = React.useCallback(
    debounce(fetchMetricChartData, 500),
    [],
  );
  const loadPage = () => {
    if (!inView) return;
    if (prevMetricRef.current && prevMetricRef.current.name !== _metric.name) {
      prevMetricRef.current = _metric;
      return;
    }
    prevMetricRef.current = _metric;
    const timestmaps = drillDownPeriod.toTimestamps();
    const density = props.isPreview ? metric.density : dashboardStore.selectedDensity
    const payload = isSaved
      ? { ...metricParams, density }
      : { ...params, ...timestmaps, ..._metric.toJson(), density };
    debounceRequest(
      _metric,
      payload,
      isSaved,
      !isSaved ? drillDownPeriod : period,
    );
  };

  const loadComparisonData = () => {
    if (!dashboardStore.comparisonPeriods[_metric.metricId])
      return setCompData(null);

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
      true,
    );
  };
  useEffect(() => {
    if (!inView || !props.isPreview) return;
    loadComparisonData();
  }, [
    inView,
    props.isPreview,
    dashboardStore.comparisonPeriods[_metric.metricId],
    _metric.metricId,
    drillDownPeriod,
    period,
    depsString,
    dashboardStore.selectedDensity,
    _metric.metricOf,
  ]);
  useEffect(() => {
    setCompData(null);
    _metric.updateKey('page', 1);
    _metric.updateKey();
    loadPage();
  }, [
    drillDownPeriod,
    period,
    depsString,
    metric.hideExcess,
    dashboardStore.selectedDensity,
    _metric.metricType,
    _metric.metricOf,
    _metric.metricValue,
    _metric.startType,
    _metric.metricFormat,
    inView,
  ]);
  useEffect(loadPage, [_metric.page]);

  const onFocus = (seriesName: string) => {
    metricStore.setFocusedSeriesName(seriesName);
    metricStore.setDrillDown(true);
  };

  const renderChart = React.useCallback(() => {
    const { metricType, metricOf } = _metric;
    const { viewType } = _metric;
    const metricWithData = { ..._metric, data };

    if (metricType === FUNNEL) {
      if (viewType === 'table') {
        return <FunnelTable data={data} compData={compData} />;
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
            valueLabel: '%',
          },
        ];

        return (
          <BugNumChart
            values={values}
            inGrid={!props.isPreview}
            colors={colors}
            hideLegend
            onClick={onChartClick}
            label={t('Conversion')}
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
        ? compDataCopy.namesMap.map((n) => (enabledRows.includes(n) ? n : null))
        : compDataCopy.namesMap;

      if (viewType === 'lineChart') {
        return (
          <LineChart
            chartName={_metric.name}
            inGrid={!props.isPreview}
            data={chartData}
            compData={compDataCopy}
            onSeriesFocus={onFocus}
            onClick={onChartClick}
            label={
              _metric.metricOf === 'sessionCount'
                ? t('Number of Sessions')
                : t('Number of Users')
            }
          />
        );
      }
      if (viewType === 'areaChart') {
        return (
          <LineChart
            isArea
            chartName={_metric.name}
            data={chartData}
            inGrid={!props.isPreview}
            onClick={onChartClick}
            onSeriesFocus={onFocus}
            label={
              _metric.metricOf === 'sessionCount'
                ? t('Number of Sessions')
                : t('Number of Users')
            }
          />
        );
      }
      if (viewType === 'barChart') {
        return (
          <BarChart
            inGrid={!props.isPreview}
            data={chartData}
            compData={compDataCopy}
            params={params}
            colors={colors}
            onSeriesFocus={onFocus}
            onClick={onChartClick}
            label={
              _metric.metricOf === 'sessionCount'
                ? t('Number of Sessions')
                : t('Number of Users')
            }
          />
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
                ? t('Number of Sessions')
                : t('Number of Users')
            }
          />
        );
      }
      if (viewType === 'pieChart') {
        return (
          <PieChart
            inGrid={!props.isPreview}
            data={chartData}
            onSeriesFocus={onFocus}
            label={
              _metric.metricOf === 'sessionCount'
                ? t('Number of Sessions')
                : t('Number of Users')
            }
          />
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
                ? t('Number of Sessions')
                : t('Number of Users')
            }
          />
        );
      }
      if (viewType === 'table') {
        return null;
      }
      if (viewType === 'metric') {
        const values: { value: number; compData?: number; series: string }[] =
          [];
        for (let i = 0; i < data.namesMap.length; i++) {
          if (!data.namesMap[i]) {
            continue;
          }

          values.push({
            value: data.chart.reduce(
              (acc, curr) => acc + curr[data.namesMap[i]],
              0,
            ),
            compData: compData
              ? compData.chart.reduce(
                  (acc, curr) => acc + curr[compData.namesMap[i]],
                  0,
                )
              : undefined,
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
                ? t('Number of Sessions')
                : t('Number of Users')
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
            {t('No data available for the selected period.')}
          </div>
        );
      }
      return <ClickMapCard />;
    }

    if (metricType === INSIGHTS) {
      return <InsightsCard data={data} />;
    }

    if (metricType === USER_PATH && data && data.links) {
      const isUngrouped = props.isPreview
        ? !(_metric.hideExcess ?? true)
        : false;
      const height = props.isPreview ? 550 : 240;
      return (
        <SankeyChart
          height={height}
          data={data}
          inGrid={!props.isPreview}
          onChartClick={(filters: any) => {
            dashboardStore.drillDownFilter.merge({ filters, page: 1 });
          }}
          isUngrouped={isUngrouped}
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
      }
      if (viewType === 'cohort') {
        return <CohortCard data={data[0]} />;
      }
    }
    console.log('Unknown metric type', metricType);
    return <div>{t('Unknown metric type')}</div>;
  }, [data, compData, enabledRows, _metric]);

  const showTable =
    _metric.metricType === TIMESERIES &&
    (props.isPreview || _metric.viewType === TABLE);
  const tableMode =
    _metric.viewType === 'table' && _metric.metricType === TIMESERIES;
  return (
    <div ref={ref}>
      {loading ? (
        stale ? (
          <LongLoader onClick={loadSample} />
        ) : (
          <Loader loading={loading} style={{ height: '240px' }} />
        )
      ) : (
        <div style={{ minHeight: props.isPreview ? undefined : 240 }}>
          {renderChart()}
          {showTable ? (
            <WidgetDatatable
              compData={compData}
              inBuilder={props.isPreview}
              defaultOpen
              data={data}
              tableMode={tableMode}
              enabledRows={enabledRows}
              setEnabledRows={setEnabledRows}
              metric={_metric}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default observer(WidgetChart);

import { getStartAndEndTimestampsByDensity } from 'Types/dashboard/helper';
import { FilterKey } from 'Types/filter/filterType';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';

import ClickMapCard from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/ClickMapCard';
import CustomMetricPercentage from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricPercentage';
import CustomMetricTableErrors from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableErrors';
import CustomMetricTableSessions from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricTableSessions';
import InsightsCard from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/InsightsCard';
import { Styles } from 'App/components/Dashboard/Widgets/common';
import FunnelWidget from 'App/components/Funnels/FunnelWidget';
import {
  ERRORS,
  FUNNEL,
  HEATMAP,
  INSIGHTS,
  RETENTION,
  TABLE,
  TIMESERIES,
  USER_PATH,
  WEBVITALS,
} from 'App/constants/card';
import useIsMounted from 'App/hooks/useIsMounted';
import { useStore } from 'App/mstore';
import { debounce } from 'App/utils';
import {
  buildLevelTree,
  collectTimestamps,
  computeSelectionFromTopN,
  getDepth,
  remapTimestamps,
  type NestedData,
} from 'App/utils/breakdownTree';
import { hasSampling } from 'App/utils/split-utils';
import BarChart from 'Components/Charts/BarChart';
import ColumnChart from 'Components/Charts/ColumnChart';
import LineChart from 'Components/Charts/LineChart';
import PieChart from 'Components/Charts/PieChart';
import SankeyChart from 'Components/Charts/SankeyChart';
import SunBurstChart from 'Components/Charts/SunburstChart/Sunburst';
import WebVitalsChart from 'Components/Charts/WebVitals';
import SessionsBy from 'Components/Dashboard/Widgets/CustomMetricsWidgets/SessionsBy';
import SessionsByWithBreakdown from 'Components/Dashboard/Widgets/CustomMetricsWidgets/SessionsByWithBreakdown';
import { Icon, Loader } from 'UI';

import FunnelTable from '../../../Funnels/FunnelWidget/FunnelTable';
import BugNumChart from '../../Widgets/CustomMetricsWidgets/BigNumChart';
import CohortCard from '../../Widgets/CustomMetricsWidgets/CohortCard';
import BreakdownDatatable from '../WidgetDatatable/BreakdownDatatable';
import WidgetPredefinedChart from '../WidgetPredefinedChart';
import LongLoader from './LongLoader';

interface Props {
  metric: any;
  isSaved?: boolean;
  isTemplate?: boolean;
  isPreview?: boolean;
  height?: number;
}

function WidgetChart(props: Props) {
  const { t } = useTranslation();
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });
  const abortController = React.useRef<AbortController>(null);
  const { isSaved = false, metric, isTemplate, height } = props;
  const { dashboardStore, metricStore, filterStore, userStore } = useStore();
  const showSampling = hasSampling && userStore.isEnterprise;
  const _metric: any = props.metric;
  const [data, setData] = useState(_metric.data ?? { chart: [] });
  const { period } = dashboardStore;
  const { drillDownPeriod } = dashboardStore;
  const { drillDownFilter } = dashboardStore;
  const colors = Styles.safeColors;
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const params = { density: dashboardStore.selectedDensity, rows: 5 };
  const metricParams = _metric.params;
  const prevMetricRef = useRef<any>();
  const isMounted = useIsMounted();
  const [compData, setCompData] = useState<any>(null);
  const [enabledRows, setEnabledRows] = useState<string[]>(
    _metric.series.map((s) => s.name),
  );

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

  const chartData = data?.chart;
  useEffect(() => {
    if (!chartData) return;
    const series = chartData[0]
      ? Object.keys(chartData[0]).filter(
          (key) => key !== 'time' && key !== 'timestamp',
        )
      : [];
    if (series.length) {
      setEnabledRows(series);
    }
  }, [chartData]);

  const onChartClick = (event: any) => {
    metricStore.setDrillDown(true);
    if (event) {
      if (Array.isArray(event)) {
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

        // Parse breakdown filters from the clicked series name
        const breakdownFilters: any[] = [];
        const breakdowns = _metric.breakdowns;
        const seriesName: string | undefined = event.seriesName;
        if (seriesName && breakdowns && breakdowns.length > 0) {
          const baseName = seriesName.startsWith('Previous ')
            ? seriesName.slice(9)
            : seriesName;
          const seriesNames: string[] = _metric.series.map((s: any) => s.name);
          let breakdownPath = '';
          for (const sName of seriesNames) {
            if (baseName.startsWith(sName + ' / ')) {
              breakdownPath = baseName.slice(sName.length + 3);
              break;
            }
          }
          if (breakdownPath) {
            const levels = breakdownPath.split(' / ');
            for (let i = 0; i < levels.length && i < breakdowns.length; i++) {
              const filterItem = filterStore.findEvent({ name: breakdowns[i] });
              if (filterItem) {
                filterItem.value = [levels[i]];
                breakdownFilters.push(filterItem);
              }
            }
          }
        }

        const mergeData: Record<string, any> = {
          startTimestamp: periodTimestamps.startTimestamp,
          endTimestamp: periodTimestamps.endTimestamp,
        };
        if (breakdownFilters.length > 0) {
          mergeData.filters = breakdownFilters;
        }
        drillDownFilter.merge(mergeData);
      }
    }
  };

  const loadSample = async () => {
    if (abortController.current) {
      abortController.current.abort();
    }
    const timestmaps = drillDownPeriod.toTimestamps();
    const density = dashboardStore.selectedDensity;
    const payload = isSaved
      ? { ...metricParams, density }
      : { ...params, ...timestmaps, ..._metric.toJson(), density };
    const res = await dashboardStore.fetchSampleData(
      metric,
      payload,
      isSaved,
      period,
    );
    if (res) {
      setData(res);
      setStale(false);
      setLoading(false);
    }
  };

  const depsString =
    _metric.metricType === USER_PATH
      ? JSON.stringify({
          ..._metric.series,
          ..._metric.excludes,
          ..._metric.startPoint,
          viewType: _metric.viewType,
          hideExcess: false,
        })
      : JSON.stringify({
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
    abortController.current = new AbortController();
    const signal = abortController.current.signal;
    setLoading(true);
    const tm = setTimeout(() => {
      setStale(true);
    }, 4000);
    dashboardStore
      .fetchMetricChartData(
        metric,
        payload,
        isSaved,
        period,
        isComparison,
        signal,
      )
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
    const density = dashboardStore.selectedDensity;
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
    _metric.breakdowns,
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
    _metric.sortBy,
    _metric.rows,
    _metric.stepsBefore,
    _metric.stepsAfter,
    _metric.breakdowns,
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
            height={height}
          />
        );
      }

      return (
        <FunnelWidget
          metric={_metric}
          data={data}
          compData={compData}
          isWidget={isSaved || isTemplate}
          height={height}
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
          height={height}
        />
      );
    }

    if (metricType === TIMESERIES) {
      const labels = {
        sessionCount: t('Number of Sessions'),
        eventCount: t('Number of Events'),
        userCount: t('Number of Users'),
      };
      const topN = metricStore.breakdownTopN;
      const chartData = { ...data };
      chartData.namesMap = Array.isArray(chartData.namesMap)
        ? chartData.namesMap.map((n) => (enabledRows.includes(n) ? n : null))
        : chartData.namesMap;

      // Filter chart lines by breakdown selection (or fall back to topN)
      const breakdownSel = metricStore.breakdownSelection;
      if (
        Object.keys(breakdownSel).length > 0 &&
        Array.isArray(chartData.namesMap)
      ) {
        const seriesNames: string[] = _metric.series.map((s: any) => s.name);
        chartData.namesMap = chartData.namesMap.map((n: string | null) => {
          if (n == null) return null;
          const isPrevious = n.startsWith('Previous ');
          const baseName = isPrevious ? n.slice(9) : n;
          let breakdownPath = baseName;
          for (const sName of seriesNames) {
            if (baseName === sName) {
              breakdownPath = '';
              break;
            }
            if (baseName.startsWith(sName + ' / ')) {
              breakdownPath = baseName.slice(sName.length + 3);
              break;
            }
          }
          if (!breakdownPath) return n;
          const levels = breakdownPath.split(' / ');
          for (let i = 0; i < levels.length; i++) {
            const parentPath = levels.slice(0, i).join(' / ');
            const sel = breakdownSel[parentPath];
            if (sel !== undefined && sel !== null && !sel.includes(levels[i])) {
              return null;
            }
          }
          return n;
        });
      } else if (topN > 0 && Array.isArray(chartData.namesMap)) {
        // Fallback to topN if selection not yet initialised
        let kept = 0;
        chartData.namesMap = chartData.namesMap.map((n: string | null) => {
          if (n == null) return null;
          kept++;
          return kept <= topN ? n : null;
        });
      }

      const compDataCopy = { ...compData };
      compDataCopy.namesMap = Array.isArray(compDataCopy.namesMap)
        ? compDataCopy.namesMap.map((n) => {
            const baseName = n?.replace(/^Previous\s+/, '');
            return chartData.namesMap?.includes(baseName) ? n : null;
          })
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
            height={height}
            label={
              _metric.metricOf ? labels[_metric.metricOf] : labels.sessionCount
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
              _metric.metricOf ? labels[_metric.metricOf] : labels.sessionCount
            }
          />
        );
      }
      if (viewType === 'barChart') {
        return (
          <BarChart
            inGrid={!props.isPreview}
            height={height}
            data={chartData}
            compData={compDataCopy}
            params={params}
            colors={colors}
            onSeriesFocus={onFocus}
            onClick={onChartClick}
            label={
              _metric.metricOf ? labels[_metric.metricOf] : labels.sessionCount
            }
          />
        );
      }

      if (viewType === 'progressChart') {
        return (
          <ColumnChart
            height={height}
            inGrid={!props.isPreview}
            horizontal
            data={chartData}
            compData={compDataCopy}
            params={params}
            colors={colors}
            onSeriesFocus={onFocus}
            label={
              _metric.metricOf ? labels[_metric.metricOf] : labels.sessionCount
            }
          />
        );
      }
      if (viewType === 'pieChart') {
        return (
          <PieChart
            height={height}
            inGrid={!props.isPreview}
            data={chartData}
            onSeriesFocus={onFocus}
            label={
              _metric.metricOf ? labels[_metric.metricOf] : labels.sessionCount
            }
          />
        );
      }
      if (viewType === 'progress') {
        return (
          <CustomMetricPercentage
            inGrid={!props.isPreview}
            data={data[0]}
            height={height}
            colors={colors}
            params={params}
            label={
              _metric.metricOf ? labels[_metric.metricOf] : labels.sessionCount
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
            height={height}
            inGrid={!props.isPreview}
            colors={colors}
            onSeriesFocus={onFocus}
            onClick={onChartClick}
            label={
              _metric.metricOf ? labels[_metric.metricOf] : labels.sessionCount
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
            height={height}
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
            inGrid={!props.isPreview}
            height={height}
            isEdit={!isSaved && !isTemplate}
          />
        );
      }
      if (viewType === TABLE) {
        if (data.hasBreakdown) {
          return (
            <SessionsByWithBreakdown
              metric={_metric}
              data={data}
              onClick={onChartClick}
              isTemplate={isTemplate}
            />
          );
        }
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
            <img
              src={_metric.thumbnail}
              alt="clickmap thumbnail"
              className="w-full h-full object-cover"
            />
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
      return <ClickMapCard height={height} />;
    }

    if (metricType === INSIGHTS) {
      return <InsightsCard height={height} data={data} />;
    }

    if (metricType === USER_PATH && data) {
      if (viewType === 'sunburst' && Array.isArray(data)) {
        const isUngrouped = props.isPreview
          ? !(_metric.hideExcess ?? true)
          : false;
        const height = props.isPreview ? 550 : 240;
        return (
          <SunBurstChart
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
      if (viewType === 'lineChart' && data.links) {
        const isUngrouped = props.isPreview
          ? !(_metric.hideExcess ?? true)
          : false;
        const height = props.isPreview ? 550 : 240;
        const startUrl =
          metric.startPoint?.filter?.filters.find(
            (f: any) => f.name === 'url_path',
          )?.value[0] ?? 'unref';
        const getFilter = (name: string) => filterStore.findEvent({ name });
        return (
          <SankeyChart
            height={height}
            data={data}
            inGrid={!props.isPreview}
            onChartClick={(filters: any) => {
              dashboardStore.drillDownFilter.merge({ filters, page: 1 });
            }}
            isUngrouped={isUngrouped}
            startUrl={startUrl}
            getFilter={getFilter}
            drilldownFilter={dashboardStore.drillDownFilter.filters}
          />
        );
      }
    }

    if (metricType === RETENTION) {
      if (viewType === 'trend') {
        return (
          <LineChart
            height={height}
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
    if (metricType === WEBVITALS) {
      return (
        <WebVitalsChart
          inGrid={!props.isPreview}
          data={data}
          onFocus={onChartClick}
        />
      );
    }
    console.log('Unknown metric type', metricType);
    return (
      <div>
        {t('Unknown metric type')} {metricType}
      </div>
    );
  }, [
    data,
    compData,
    enabledRows,
    _metric,
    metricStore.breakdownTopN,
    metricStore.breakdownSelection,
  ]);

  const showTable =
    _metric.metricType === TIMESERIES &&
    (props.isPreview || _metric.viewType === TABLE);

  const mergedBreakdownData = React.useMemo(() => {
    if (!data?.breakdownData) return null;
    if (!compData?.breakdownData) return data.breakdownData;

    const curTs = new Set<string>();
    Object.values(data.breakdownData).forEach((d) =>
      collectTimestamps(d, curTs),
    );
    const compTs = new Set<string>();
    Object.values(compData.breakdownData).forEach((d) =>
      collectTimestamps(d, compTs),
    );

    const curArr = Array.from(curTs).sort((a, b) => Number(a) - Number(b));
    const compArr = Array.from(compTs).sort((a, b) => Number(a) - Number(b));
    const tsMap: Record<string, string> = {};
    compArr.forEach((ts, i) => {
      if (curArr[i]) tsMap[ts] = curArr[i];
    });

    const remapped = Object.fromEntries(
      Object.entries(compData.breakdownData).map(([k, v]) => [
        `Previous ${k}`,
        remapTimestamps(v, tsMap),
      ]),
    );
    return { ...data.breakdownData, ...remapped };
  }, [data?.breakdownData, compData?.breakdownData]);

  const breakdownInitialized = React.useRef(false);

  // Reset selection when breakdown configuration changes
  React.useEffect(() => {
    breakdownInitialized.current = false;
    metricStore.clearBreakdownSelection();
  }, [_metric.breakdowns]);

  // Initialise breakdown selection when data first loads
  React.useEffect(() => {
    if (mergedBreakdownData && !breakdownInitialized.current) {
      const depth = Math.max(
        0,
        ...Object.values(mergedBreakdownData).map((d) =>
          getDepth(d as NestedData),
        ),
      );
      if (depth > 0) {
        breakdownInitialized.current = true;
        const tree = buildLevelTree(mergedBreakdownData);
        const selection = computeSelectionFromTopN(
          tree,
          metricStore.breakdownLevelTopN,
          depth,
        );
        metricStore.setBreakdownSelection(selection);
      }
    }
  }, [mergedBreakdownData, metricStore.breakdownLevelTopN]);

  return (
    <div ref={ref}>
      {loading ? (
        stale ? (
          <LongLoader onClick={loadSample} withSampling={showSampling} />
        ) : (
          <Loader loading={loading} style={{ height: '240px' }} />
        )
      ) : (
        <div style={{ minHeight: props.isPreview ? undefined : 240 }}>
          {renderChart()}
          {showTable &&
          mergedBreakdownData &&
          Object.keys(mergedBreakdownData).length > 0 ? (
            <BreakdownDatatable
              data={mergedBreakdownData}
              breakdownLabels={_metric.breakdowns}
              inBuilder={props.isPreview}
              defaultOpen
              metric={_metric}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export default observer(WidgetChart);

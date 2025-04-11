import React, { useEffect, useState, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import {
  metricOf,
  issueOptions,
  issueCategories,
} from 'App/constants/filterOptions';
import { FilterKey } from 'Types/filter/filterType';
import { withSiteId, dashboardMetricDetails, metricDetails } from 'App/routes';
import { Icon, confirm } from 'UI';
import { Card, Input, Space, Button, Segmented, Alert } from 'antd';
import { AudioWaveform } from 'lucide-react';
import Select from 'Shared/Select';
import { eventKeys } from 'App/types/filter/newFilter';
import FilterItem from 'Shared/Filters/FilterItem';
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
import { useHistory } from 'react-router';
import { renderClickmapThumbnail } from './renderMap';
import MetricSubtypeDropdown from './components/MetricSubtypeDropdown';
import MetricTypeDropdown from './components/MetricTypeDropdown';
import FilterSeries from '../FilterSeries';
import { useTranslation } from 'react-i18next';

const tableOptions = metricOf.filter((i) => i.type === 'table');

function AIInput({ value, setValue, placeholder, onEnter }) {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="w-full mb-2 bg-white"
      onKeyDown={(e) => e.key === 'Enter' && onEnter()}
    />
  );
}

function PredefinedMessage() {
  const { t } = useTranslation();
  return (
    <Alert
      message={t("Drilldown or filtering isn't supported on this legacy card.")}
      type="warning"
      showIcon
      closable
      className="border-transparent rounded-lg"
    />
  );
}

function MetricTabs({ metric, writeOption }: any) {
  if (![TABLE].includes(metric.metricType)) return null;

  const onChange = (value: string) => {
    writeOption({
      value: {
        value,
      },
      name: 'metricOf',
    });
  };

  return (
    <Segmented
      options={tableOptions}
      onChange={onChange}
      selected={metric.metricOf}
    />
  );
}

function MetricOptions({ metric, writeOption }: any) {
  const { t } = useTranslation();
  const isUserPath = metric.metricType === USER_PATH;

  return (
    <div className="form-group">
      <div className="flex items-center">
        <span className="mr-2">{t('Card showing')}</span>
        <MetricTypeDropdown onSelect={writeOption} />
        <MetricSubtypeDropdown onSelect={writeOption} />
        {isUserPath && (
          <>
            <span className="mx-3" />
            <Select
              name="startType"
              options={[
                { value: 'start', label: t('With Start Point') },
                { value: 'end', label: t('With End Point') },
              ]}
              defaultValue={metric.startType}
              onChange={writeOption}
              placeholder={t('All Issues')}
            />
            <span className="mx-3">{t('showing')}</span>
            <Select
              name="metricValue"
              options={[
                { value: 'location', label: t('Pages') },
                { value: 'click', label: t('Clicks') },
                { value: 'input', label: t('Input') },
                { value: 'custom', label: t('Custom') },
              ]}
              defaultValue={metric.metricValue}
              isMulti
              onChange={writeOption}
              placeholder={t('All Issues')}
            />
          </>
        )}
        {metric.metricOf === FilterKey.ISSUE && metric.metricType === TABLE && (
          <>
            <span className="mx-3">{t('issue type')}</span>
            <Select
              name="metricValue"
              options={issueOptions}
              value={metric.metricValue}
              onChange={writeOption}
              isMulti
              placeholder={t('All Issues')}
            />
          </>
        )}
        {metric.metricType === INSIGHTS && (
          <>
            <span className="mx-3">{t('of')}</span>
            <Select
              name="metricValue"
              options={issueCategories}
              value={metric.metricValue}
              onChange={writeOption}
              isMulti
              placeholder={t('All Categories')}
            />
          </>
        )}
        {metric.metricType === TABLE &&
          !(
            metric.metricOf === FilterKey.ERRORS ||
            metric.metricOf === FilterKey.SESSIONS
          ) && (
            <>
              <span className="mx-3">{t('showing')}</span>
              <Select
                name="metricFormat"
                options={[{ value: 'sessionCount', label: t('Session Count') }]}
                defaultValue={metric.metricFormat}
                onChange={writeOption}
              />
            </>
          )}
      </div>
    </div>
  );
}

const PathAnalysisFilter = observer(({ metric }: any) => (
  <Card
    styles={{
      body: { padding: '4px 20px' },
      header: {
        padding: '4px 20px',
        fontSize: '14px',
        fontWeight: 'bold',
        borderBottom: 'none',
      },
    }}
    title={metric.startType === 'start' ? 'Start Point' : 'End Point'}
  >
    <div className="form-group flex flex-col">
      {/* {metric.startType === 'start' ? 'Start Point' : 'End Point'} */}
      <FilterItem
        hideDelete
        filter={metric.startPoint}
        allowedFilterKeys={[
          FilterKey.LOCATION,
          FilterKey.CLICK,
          FilterKey.INPUT,
          FilterKey.CUSTOM,
        ]}
        onUpdate={(val) => metric.updateStartPoint(val)}
        onRemoveFilter={() => {}}
      />
    </div>
  </Card>
));

const SeriesList = observer(() => {
  const { t } = useTranslation();
  const { metricStore, dashboardStore, aiFiltersStore } = useStore();
  const metric = metricStore.instance;
  const excludeFilterKeys = [HEATMAP, USER_PATH].includes(metric.metricType)
    ? eventKeys
    : [];
  const hasSeries = ![
    TABLE,
    FUNNEL,
    HEATMAP,
    INSIGHTS,
    USER_PATH,
    RETENTION,
  ].includes(metric.metricType);
  const canAddSeries = metric.series.length < 3;

  return (
    <div>
      {metric.series.length > 0 &&
        metric.series
          .slice(0, hasSeries ? metric.series.length : 1)
          .map((series, index) => (
            <div className="mb-2" key={series.name}>
              <FilterSeries
                canExclude={metric.metricType === USER_PATH}
                supportsEmpty={
                  ![HEATMAP, USER_PATH].includes(metric.metricType)
                }
                excludeFilterKeys={excludeFilterKeys}
                observeChanges={() => metric.updateKey('hasChanged', true)}
                hideHeader={[
                  TABLE,
                  HEATMAP,
                  INSIGHTS,
                  USER_PATH,
                  FUNNEL,
                ].includes(metric.metricType)}
                seriesIndex={index}
                series={series}
                onRemoveSeries={() => metric.removeSeries(index)}
                canDelete={metric.series.length > 1}
                emptyMessage={
                  metric.metricType === TABLE
                    ? t(
                        'Filter data using any event or attribute. Use Add Step button below to do so.',
                      )
                    : t('Add an event or filter step to define the series.')
                }
              />
            </div>
          ))}
      {hasSeries && (
        <Card
          styles={{ body: { padding: '4px' } }}
          className="rounded-full shadow-sm"
        >
          <Button
            type="link"
            onClick={() => metric.addSeries()}
            disabled={!canAddSeries}
            size="small"
            className="block w-full"
          >
            <Space>
              <AudioWaveform size={16} />
              {t('New Chart Series')}
            </Space>
          </Button>
        </Card>
      )}
    </div>
  );
});

interface RouteParams {
  siteId: string;
  dashboardId: string;
  metricId: string;
}

interface CardBuilderProps {
  siteId: string;
  dashboardId?: string;
  metricId?: string;
}

const CardBuilder = observer((props: CardBuilderProps) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { siteId, dashboardId, metricId } = props;
  const { metricStore, dashboardStore, aiFiltersStore } = useStore();
  const [aiQuery, setAiQuery] = useState('');
  const [aiAskChart, setAiAskChart] = useState('');
  const [initialInstance, setInitialInstance] = useState(null);
  const metric = metricStore.instance;
  const timeseriesOptions = metricOf.filter((i) => i.type === 'timeseries');
  const tableOptions = metricOf.filter((i) => i.type === 'table');
  const isPredefined = metric.metricType === ERRORS;
  const testingKey =
    localStorage.getItem('__mauricio_testing_access') === 'true';

  useEffect(() => {
    if (metric && !initialInstance) setInitialInstance(metric.toJson());
  }, [metric]);

  const writeOption = useCallback(
    ({ value, name }) => {
      value = Array.isArray(value) ? value : value.value;
      const obj: any = { [name]: value };
      if (name === 'metricType') {
        if (value === TIMESERIES) obj.metricOf = timeseriesOptions[0].value;
        if (value === TABLE) obj.metricOf = tableOptions[0].value;
      }
      metricStore.merge(obj);
    },
    [metricStore, timeseriesOptions, tableOptions],
  );

  const onSave = useCallback(async () => {
    const wasCreating = !metric.exists();
    if (metric.metricType === HEATMAP) {
      try {
        metric.thumbnail = await renderClickmapThumbnail();
      } catch (e) {
        console.error(e);
      }
    }
    const savedMetric = await metricStore.save(metric);
    setInitialInstance(metric.toJson());
    if (wasCreating) {
      const route =
        parseInt(dashboardId, 10) > 0
          ? withSiteId(
              dashboardMetricDetails(dashboardId, savedMetric.metricId),
              siteId,
            )
          : withSiteId(metricDetails(savedMetric.metricId), siteId);
      history.replace(route);
      if (parseInt(dashboardId, 10) > 0) {
        dashboardStore.addWidgetToDashboard(
          dashboardStore.getDashboard(parseInt(dashboardId, 10)),
          [savedMetric.metricId],
        );
      }
    }
  }, [dashboardId, dashboardStore, history, metric, metricStore, siteId]);

  const onDelete = useCallback(async () => {
    if (
      await confirm({
        header: t('Confirm'),
        confirmButton: t('Yes, delete'),
        confirmation: t(
          'Are you sure you want to permanently delete this card?',
        ),
      })
    ) {
      metricStore.delete(metric).then(onDelete);
    }
  }, [metric, metricStore]);

  // const undoChanges = useCallback(() => {
  //     const w = new Widget();
  //     metricStore.merge(w.fromJson(initialInstance), false);
  // }, [initialInstance, metricStore]);

  const fetchResults = useCallback(
    () =>
      aiFiltersStore
        .getCardFilters(aiQuery, metric.metricType)
        .then((f) => metric.createSeries(f.filters)),
    [aiFiltersStore, aiQuery, metric],
  );

  const fetchChartData = useCallback(
    () => aiFiltersStore.getCardData(aiAskChart, metric.toJson()),
    [aiAskChart, aiFiltersStore, metric],
  );

  return (
    <div className="flex gap-6 flex-col">
      {/* <MetricOptions */}
      {/*    metric={metric} */}
      {/*    writeOption={writeOption} */}
      {/* /> */}

      {/* <MetricTabs metric={metric} */}
      {/*            writeOption={writeOption}/> */}

      {metric.metricType === USER_PATH && (
        <PathAnalysisFilter metric={metric} />
      )}
      {isPredefined && <PredefinedMessage />}
      {testingKey && (
        <>
          <AIInput
            value={aiQuery}
            setValue={setAiQuery}
            placeholder={t('AI Query')}
            onEnter={fetchResults}
          />
          <AIInput
            value={aiAskChart}
            setValue={setAiAskChart}
            placeholder={t('AI Ask Chart')}
            onEnter={fetchChartData}
          />
        </>
      )}
      {aiFiltersStore.isLoading && (
        <div>
          <div className="flex items-center font-medium py-2">
            {t('Loading')}
          </div>
        </div>
      )}
      {!isPredefined && <SeriesList />}
    </div>
  );
});

export default CardBuilder;

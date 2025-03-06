import React from 'react';
import { Card, Space, Button, Alert, Form, Select, Tooltip } from 'antd';
import { useStore } from 'App/mstore';
import { eventKeys } from 'Types/filter/newFilter';
import {
  HEATMAP,
  ERRORS,
  FUNNEL,
  INSIGHTS,
  RETENTION,
  TABLE,
  USER_PATH,
} from 'App/constants/card';
import FilterSeries from 'Components/Dashboard/components/FilterSeries/FilterSeries';
import { issueCategories } from 'App/constants/filterOptions';
import { PlusIcon, ChevronUp } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import FilterItem from 'Shared/Filters/FilterItem';
import { FilterKey, FilterCategory } from 'Types/filter/filterType';
import { useTranslation } from 'react-i18next';

const getExcludedKeys = (metricType: string) => {
  switch (metricType) {
    case USER_PATH:
    case HEATMAP:
      return eventKeys;
    default:
      return [];
  }
};

const getExcludedCategories = (metricType: string) => {
  switch (metricType) {
    case USER_PATH:
    case FUNNEL:
      return [FilterCategory.DEVTOOLS];
    default:
      return [];
  }
};

function WidgetFormNew({ layout }: { layout: string }) {
  const { metricStore } = useStore();
  const metric: any = metricStore.instance;
  const excludeFilterKeys = getExcludedKeys(metric.metricType);
  const excludeCategory = getExcludedCategories(metric.metricType);

  const isPredefined = metric.metricType === ERRORS;

  return isPredefined ? (
    <PredefinedMessage />
  ) : (
    <Space direction="vertical" className="w-full">
      <AdditionalFilters />
      <FilterSection
        layout={layout}
        metric={metric}
        excludeCategory={excludeCategory}
        excludeFilterKeys={excludeFilterKeys}
      />
    </Space>
  );
}

export default observer(WidgetFormNew);

const FilterSection = observer(
  ({ layout, metric, excludeFilterKeys, excludeCategory }: any) => {
    const { t } = useTranslation();
    const allOpen = layout.startsWith('flex-row');
    const defaultClosed = React.useRef(!allOpen && metric.exists());
    const [seriesCollapseState, setSeriesCollapseState] = React.useState<
      Record<number, boolean>
    >({});

    React.useEffect(() => {
      const defaultSeriesCollapseState: Record<number, boolean> = {};
      metric.series.forEach((s: any) => {
        defaultSeriesCollapseState[s.seriesId] = isTable
          ? false
          : allOpen
            ? false
            : defaultClosed.current;
      });
      setSeriesCollapseState(defaultSeriesCollapseState);
    }, [metric.series]);
    const isTable = metric.metricType === TABLE;
    const isHeatMap = metric.metricType === HEATMAP;
    const isFunnel = metric.metricType === FUNNEL;
    const isInsights = metric.metricType === INSIGHTS;
    const isPathAnalysis = metric.metricType === USER_PATH;
    const isRetention = metric.metricType === RETENTION;
    const canAddSeries = metric.series.length < 3;

    const isSingleSeries =
      isTable ||
      isFunnel ||
      isHeatMap ||
      isInsights ||
      isRetention ||
      isPathAnalysis;

    const collapseAll = () => {
      setSeriesCollapseState((seriesCollapseState) => {
        const newState = { ...seriesCollapseState };
        Object.keys(newState).forEach((key) => {
          newState[key] = true;
        });
        return newState;
      });
    };
    const expandAll = () => {
      setSeriesCollapseState((seriesCollapseState) => {
        const newState = { ...seriesCollapseState };
        Object.keys(newState).forEach((key) => {
          newState[key] = false;
        });
        return newState;
      });
    };

    const allCollapsed = Object.values(seriesCollapseState).every((v) => v);
    return (
      <>
        {metric.series.length > 0 &&
          metric.series
            .slice(0, isSingleSeries ? 1 : metric.series.length)
            .map((series: any, index: number) => (
              <div className="mb-2 rounded-xl" key={series.name}>
                <FilterSeries
                  isHeatmap={isHeatMap}
                  canExclude={isPathAnalysis}
                  removeEvents={isPathAnalysis}
                  supportsEmpty={!isHeatMap && !isPathAnalysis}
                  excludeFilterKeys={excludeFilterKeys}
                  excludeCategory={excludeCategory}
                  observeChanges={() => metric.updateKey('hasChanged', true)}
                  hideHeader={
                    isTable ||
                    isHeatMap ||
                    isInsights ||
                    isPathAnalysis ||
                    isFunnel
                  }
                  seriesIndex={index}
                  series={series}
                  onRemoveSeries={() => metric.removeSeries(index)}
                  canDelete={metric.series.length > 1}
                  collapseState={seriesCollapseState[series.seriesId]}
                  onToggleCollapse={() => {
                    setSeriesCollapseState((seriesCollapseState) => ({
                      ...seriesCollapseState,
                      [series.seriesId]: !seriesCollapseState[series.seriesId],
                    }));
                  }}
                  emptyMessage={
                    isTable
                      ? t(
                          'Filter data using any event or attribute. Use Add Step button below to do so.',
                        )
                      : t('Add an event or filter step to define the series.')
                  }
                  expandable={isSingleSeries}
                />
              </div>
            ))}
        {isSingleSeries ? null : (
          <div className="mx-auto flex items-center gap-2 w-fit">
            <Tooltip
              title={canAddSeries ? '' : t('Maximum of 3 series reached.')}
            >
              <Button
                onClick={() => {
                  if (!canAddSeries) return;
                  metric.addSeries();
                }}
                disabled={!canAddSeries}
                size="small"
                type="primary"
                icon={<PlusIcon size={16} />}
              >
                {t('Add Series')}
              </Button>
            </Tooltip>
            <Button
              size="small"
              type="text"
              icon={
                <ChevronUp
                  size={16}
                  className={allCollapsed ? 'rotate-180' : ''}
                />
              }
              onClick={allCollapsed ? expandAll : collapseAll}
            >
              {allCollapsed ? t('Expand') : t('Collapse')}&nbsp;{t('All')}
            </Button>
          </div>
        )}
      </>
    );
  },
);

const PathAnalysisFilter = observer(({ metric, writeOption }: any) => {
  const { t } = useTranslation();
  const metricValueOptions = [
    { value: 'location', label: t('Pages') },
    { value: 'click', label: t('Clicks') },
    { value: 'input', label: t('Input') },
    { value: 'custom', label: t('Custom Events') },
  ];

  const onPointChange = (value: any) => {
    writeOption({ name: 'startType', value: { value } });
  };
  return (
    <div className="rounded-lg bg-white border">
      <div className="flex flex-col justify-start gap-2 flex-wrap">
        <Form.Item className="mb-0 hover:bg-bg-blue/30 px-4 pb-1 pt-2">
          <div className="flex flex-wrap gap-2 items-center justify-start">
            <span className="font-medium">{t('Journeys With')}</span>
            <div className="flex gap-2 items-center">
              <Select
                className="w-36 rounded-lg"
                name="startType"
                options={[
                  { value: 'start', label: t('Start Point') },
                  { value: 'end', label: t('End Point') },
                ]}
                defaultValue={metric.startType || 'start'}
                onChange={onPointChange}
                placeholder={t('Select Start Type')}
              />

              <span className="">{t('showing')}</span>

              <Select
                mode="multiple"
                className="rounded-lg w-max	min-w-44 max-w-58"
                allowClear
                name="metricValue"
                options={metricValueOptions}
                value={metric.metricValue || []}
                onChange={(value) =>
                  writeOption({ name: 'metricValue', value })
                }
                placeholder={t('Select Metrics')}
                maxTagCount={'responsive'}
                showSearch={false}
              />
            </div>
          </div>
        </Form.Item>
        <Form.Item className="mb-0 hover:bg-bg-blue/30 px-4  pb-2 pt-1">
          <div className="flex flex-wrap items-center justify-start">
            <span className="font-medium mr-2">
              {metric.startType === 'start' ? t('Start Point') : t('End Point')}
            </span>
            <span className="font-normal">
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
            </span>
          </div>
        </Form.Item>
      </div>
    </div>
  );
});

const InsightsFilter = observer(({ metric, writeOption }: any) => {
  const { t } = useTranslation();
  return (
    <Card styles={{ body: { padding: '20px 20px' } }}>
      <Form.Item className="mb-0">
        <Space>
          <Select
            name="metricValue"
            options={issueCategories}
            value={metric.metricValue}
            onChange={writeOption}
            isMulti
            placeholder={t('All Categories')}
            allowClear
          />
        </Space>
      </Form.Item>
    </Card>
  );
});

const AdditionalFilters = observer(() => {
  const { metricStore } = useStore();
  const metric: any = metricStore.instance;

  const writeOption = ({ value, name }: { value: any; name: any }) => {
    value = Array.isArray(value) ? value : value.value;
    const obj: any = { [name]: value };
    metricStore.merge(obj);
  };

  return (
    <>
      {metric.metricType === USER_PATH && (
        <PathAnalysisFilter metric={metric} writeOption={writeOption} />
      )}
      {metric.metricType === INSIGHTS && (
        <InsightsFilter metric={metric} writeOption={writeOption} />
      )}
    </>
  );
});

const PredefinedMessage = () => {
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
};

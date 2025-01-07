import React from 'react';
import { Card, Space, Button, Alert, Form, Select } from 'antd';
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
import { PlusIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import FilterItem from 'Shared/Filters/FilterItem';
import { FilterKey } from 'Types/filter/filterType';

function WidgetFormNew() {
  const { metricStore } = useStore();
  const metric: any = metricStore.instance;

  const isHeatMap = metric.metricType === HEATMAP;
  const isPathAnalysis = metric.metricType === USER_PATH;
  const excludeFilterKeys = isHeatMap || isPathAnalysis ? eventKeys : [];
  const isPredefined = metric.metricType === ERRORS;

  return isPredefined ? (
    <PredefinedMessage />
  ) : (
    <Space direction="vertical" className="w-full">
      <AdditionalFilters />
      <FilterSection metric={metric} excludeFilterKeys={excludeFilterKeys} />
    </Space>
  );
}

export default observer(WidgetFormNew);

const FilterSection = observer(({ metric, excludeFilterKeys }: any) => {
  const defaultClosed = React.useRef(metric.exists());
  const defaultSeries = React.useRef(metric.series.map((s) => s.name));
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
                defaultClosed={
                  metric.hasChanged
                    ? defaultSeries.current.includes(series.name)
                    : defaultClosed.current
                }
                emptyMessage={
                  isTable
                    ? 'Filter data using any event or attribute. Use Add Step button below to do so.'
                    : 'Add an event or filter step to define the series.'
                }
                expandable={isSingleSeries}
              />
            </div>
          ))}

      {!isSingleSeries && canAddSeries && (
        <Button
          onClick={() => {
            if (!canAddSeries) return;
            metric.addSeries();
          }}
          size="small"
          type="text"
          className="w-full cursor-pointer flex items-center py-2 justify-center gap-2 font-medium hover:text-teal btn-add-series"
        >
          <PlusIcon size={16} />
          Add Series
        </Button>
      )}
    </>
  );
});

const PathAnalysisFilter = observer(({ metric, writeOption }: any) => {
  const metricValueOptions = [
    { value: 'location', label: 'Pages' },
    { value: 'click', label: 'Clicks' },
    { value: 'input', label: 'Input' },
    { value: 'custom', label: 'Custom' },
  ];
  return (
    <Card styles={{ body: { padding: '20px 20px' } }} className="rounded-lg">
      <Form.Item>
        <div className="flex flex-wrap gap-2 items-center justify-start">
          <span className="font-medium">User journeys with: </span>

          <div className="flex sm:flex-wrap lg:flex-nowrap gap-2 items-start">
            <Select
              className="w-36 rounded-xl"
              name="startType"
              options={[
                { value: 'start', label: 'Start Point' },
                { value: 'end', label: 'End Point' },
              ]}
              defaultValue={metric.startType || 'start'}
              onChange={(value) => writeOption({ name: 'startType', value })}
              placeholder="Select Start Type"
              size="small"
            />

            <span className="text-neutral-400 mt-.5">showing</span>

            <Select
              mode="multiple"
              className="min-w-36 rounded-xl"
              allowClear
              name="metricValue"
              options={metricValueOptions}
              value={metric.metricValue || []}
              onChange={(value) => writeOption({ name: 'metricValue', value })}
              placeholder="Select Metrics"
              size="small"
            />
          </div>
        </div>
      </Form.Item>
      <div className="flex items-center">
        <Form.Item
          label={
            metric.startType === 'start'
              ? 'Specify Start Point'
              : 'Specify End Point'
          }
          className="m0-0 font-medium p-0 h-fit"
        >
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
        </Form.Item>
      </div>
    </Card>
  );
});

const InsightsFilter = observer(({ metric, writeOption }: any) => {
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
            placeholder="All Categories"
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

const PredefinedMessage = () => (
  <Alert
    message="Drilldown or filtering isn't supported on this legacy card."
    type="warning"
    showIcon
    closable
    className="border-transparent rounded-lg"
  />
);

import React from 'react';
import { Card, Space, Typography, Button, Alert } from 'antd';
import { useStore } from 'App/mstore';
import { eventKeys } from 'Types/filter/newFilter';
import {
  HEATMAP,
  ERRORS,
  FUNNEL,
  INSIGHTS,
  PERFORMANCE,
  RESOURCE_MONITORING,
  RETENTION,
  TABLE,
  USER_PATH, WEB_VITALS
} from 'App/constants/card';
import FilterSeries from 'Components/Dashboard/components/FilterSeries/FilterSeries';
import { metricOf } from 'App/constants/filterOptions';
import { AudioWaveform, ChevronDown, ChevronUp, PlusIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import AddStepButton from 'Components/Dashboard/components/FilterSeries/AddStepButton';
import FilterItem from 'Shared/Filters/FilterItem';
import { FilterKey } from 'Types/filter/filterType';

function WidgetFormNew() {
  const { metricStore, dashboardStore, aiFiltersStore } = useStore();
  const metric: any = metricStore.instance;

  const eventsLength = metric.series[0].filter.filters.filter((i: any) => i && i.isEvent).length;
  const filtersLength = metric.series[0].filter.filters.filter((i: any) => i && !i.isEvent).length;
  const isClickMap = metric.metricType === HEATMAP;
  const isPathAnalysis = metric.metricType === USER_PATH;
  const excludeFilterKeys = isClickMap || isPathAnalysis ? eventKeys : [];
  const hasFilters = filtersLength > 0 || eventsLength > 0;
  const isPredefined = [ERRORS, PERFORMANCE, RESOURCE_MONITORING, WEB_VITALS].includes(metric.metricType);

  return isPredefined ? <PredefinedMessage /> : (
    <Space direction="vertical" className="w-full">
      <AdditionalFilters />
      {!hasFilters && (<DefineSteps metric={metric} excludeFilterKeys={excludeFilterKeys} />)}
      {hasFilters && (<FilterSection metric={metric} excludeFilterKeys={excludeFilterKeys} />)}
    </Space>
  );
}

export default observer(WidgetFormNew);


function DefineSteps({ metric, excludeFilterKeys }: any) {
  return (
    <Card
      styles={{
        body: { padding: '0' },
        cover: {}
      }}
    >
      <div className="px-4 py-2 rounded-lg shadow-sm flex items-center">
        <Typography.Text strong>Filter</Typography.Text>
        <AddStepButton excludeFilterKeys={excludeFilterKeys} series={metric.series[0]} />
      </div>
    </Card>
  );
}


const FilterSection = observer(({ metric, excludeFilterKeys }: any) => {
  // const timeseriesOptions = metricOf.filter((i) => i.type === 'timeseries');
  // const tableOptions = metricOf.filter((i) => i.type === 'table');
  const isTable = metric.metricType === TABLE;
  const isClickMap = metric.metricType === HEATMAP;
  const isFunnel = metric.metricType === FUNNEL;
  const isInsights = metric.metricType === INSIGHTS;
  const isPathAnalysis = metric.metricType === USER_PATH;
  const isRetention = metric.metricType === RETENTION;
  const canAddSeries = metric.series.length < 3;
  const eventsLength = metric.series[0].filter.filters.filter((i: any) => i && i.isEvent).length;
  // const cannotSaveFunnel = isFunnel && (!metric.series[0] || eventsLength <= 1);

  const isSingleSeries = isTable || isFunnel || isClickMap || isInsights || isRetention;

  // const onAddFilter = (filter: any) => {
  //     metric.series[0].filter.addFilter(filter);
  //     metric.updateKey('hasChanged', true)
  // }

  return (
    <>
      {
        metric.series.length > 0 && metric.series
          .slice(0, isSingleSeries ? 1 : metric.series.length)
          .map((series: any, index: number) => (
            <div className="mb-2" key={series.name}>
              <FilterSeries
                canExclude={isPathAnalysis}
                supportsEmpty={!isClickMap && !isPathAnalysis}
                excludeFilterKeys={excludeFilterKeys}
                observeChanges={() => metric.updateKey('hasChanged', true)}
                hideHeader={isTable || isClickMap || isInsights || isPathAnalysis || isFunnel}
                seriesIndex={index}
                series={series}
                onRemoveSeries={() => metric.removeSeries(index)}
                canDelete={metric.series.length > 1}
                emptyMessage={
                  isTable
                    ? 'Filter data using any event or attribute. Use Add Step button below to do so.'
                    : 'Add an event or filter step to define the series.'
                }
                expandable={isSingleSeries}
              />
            </div>
          ))
      }

      {!isSingleSeries && canAddSeries && (
        <Card styles={{body: {padding: '4px'}}} className='rounded-full shadow-sm'>
          <Button
            type='link'
            onClick={() => {metric.addSeries();
            }}
            disabled={!canAddSeries}
            size="small"
            className='block w-full'
          >
            <Space>
              <AudioWaveform size={16}/>
              New Chart Series
            </Space>
          </Button>
        </Card>
      )}
    </>
  );
});


const PathAnalysisFilter = observer(({ metric }: any) => (
  <Card styles={{
    body: { padding: '4px 20px' },
    header: { padding: '4px 20px', fontSize: '14px', fontWeight: 'bold', borderBottom: 'none' }
  }}
        title={metric.startType === 'start' ? 'Start Point' : 'End Point'}
  >
    <div className="form-group flex flex-col">
      <FilterItem
        hideDelete
        filter={metric.startPoint}
        allowedFilterKeys={[FilterKey.LOCATION, FilterKey.CLICK, FilterKey.INPUT, FilterKey.CUSTOM]}
        onUpdate={val => metric.updateStartPoint(val)}
        onRemoveFilter={() => {
        }}
      />
    </div>
  </Card>
));

const AdditionalFilters = observer(() => {
  const { metricStore, dashboardStore, aiFiltersStore } = useStore();
  const metric: any = metricStore.instance;

  return (
    // <Space direction="vertical" className="w-full">
    metric.metricType === USER_PATH && <PathAnalysisFilter metric={metric} />
    // </Space>
  );
});


const PredefinedMessage = () => (
  <Alert message="Drilldown or filtering isn't supported on this legacy card." type="warning" showIcon closable
         className="border-transparent rounded-lg" />
);

import React, { useEffect, useState } from 'react';
import { metricOf, issueOptions, issueCategories } from 'App/constants/filterOptions';
import { FilterKey } from 'Types/filter/filterType';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Button, Icon, confirm, Tooltip } from 'UI';
import FilterSeries from '../FilterSeries';
import Select from 'Shared/Select';
import { withSiteId, dashboardMetricDetails, metricDetails } from 'App/routes';
import MetricTypeDropdown from './components/MetricTypeDropdown';
import MetricSubtypeDropdown from './components/MetricSubtypeDropdown';
import {
  TIMESERIES,
  TABLE,
  CLICKMAP,
  FUNNEL,
  ERRORS,
  RESOURCE_MONITORING,
  PERFORMANCE,
  WEB_VITALS,
  INSIGHTS,
  USER_PATH,
  RETENTION
} from 'App/constants/card';
import { eventKeys, filtersMap } from 'App/types/filter/newFilter';
import { renderClickmapThumbnail } from './renderMap';
import Widget from 'App/mstore/types/widget';
import FilterItem from 'Shared/Filters/FilterItem';

interface Props {
  history: any;
  match: any;
  onDelete: () => void;
}

function WidgetForm(props: Props) {
  const {
    history,
    match: {
      params: { siteId, dashboardId }
    }
  } = props;
  const { metricStore, dashboardStore } = useStore();
  const isSaving = metricStore.isSaving;
  const metric: any = metricStore.instance;
  const [initialInstance, setInitialInstance] = useState();

  const timeseriesOptions = metricOf.filter((i) => i.type === 'timeseries');
  const tableOptions = metricOf.filter((i) => i.type === 'table');
  const isTable = metric.metricType === TABLE;
  const isClickmap = metric.metricType === CLICKMAP;
  const isFunnel = metric.metricType === FUNNEL;
  const isInsights = metric.metricType === INSIGHTS;
  const isPathAnalysis = metric.metricType === USER_PATH;
  const isRetention = metric.metricType === RETENTION;
  const canAddSeries = metric.series.length < 3;
  const eventsLength = metric.series[0].filter.filters.filter((i: any) => i.isEvent).length;
  const cannotSaveFunnel = isFunnel && (!metric.series[0] || eventsLength <= 1);

  const isPredefined = [ERRORS, PERFORMANCE, RESOURCE_MONITORING, WEB_VITALS].includes(
    metric.metricType
  );

  const excludeFilterKeys = isClickmap || isPathAnalysis ? eventKeys : [];

  useEffect(() => {
    if (!!metric && !initialInstance) {
      setInitialInstance(metric.toJson());
    }
  }, [metric]);

  const writeOption = ({ value, name }: { value: any; name: any }) => {
    value = Array.isArray(value) ? value : value.value;
    const obj: any = { [name]: value };

    if (name === 'metricType') {
      switch (value) {
        case TIMESERIES:
          obj.metricOf = timeseriesOptions[0].value;
          break;
        case TABLE:
          obj.metricOf = tableOptions[0].value;
          break;
      }
    }

    metricStore.merge(obj);
  };

  const onSave = async () => {
    const wasCreating = !metric.exists();
    if (isClickmap) {
      try {
        metric.thumbnail = await renderClickmapThumbnail();
      } catch (e) {
        console.error(e);
      }
    }
    const savedMetric = await metricStore.save(metric);
    setInitialInstance(metric.toJson());
    if (wasCreating) {
      if (parseInt(dashboardId, 10) > 0) {
        history.replace(
          withSiteId(dashboardMetricDetails(dashboardId, savedMetric.metricId), siteId)
        );
        dashboardStore.addWidgetToDashboard(
          dashboardStore.getDashboard(parseInt(dashboardId, 10))!,
          [savedMetric.metricId]
        );
      } else {
        history.replace(withSiteId(metricDetails(savedMetric.metricId), siteId));
      }
    }
  };

  const onDelete = async () => {
    if (
      await confirm({
        header: 'Confirm',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to permanently delete this card?`
      })
    ) {
      metricStore.delete(metric).then(props.onDelete);
    }
  };

  const undoChanges = () => {
    const w = new Widget();
    metricStore.merge(w.fromJson(initialInstance), false);
  };

  return (
    <div className='p-6'>
      <div className='form-group'>
        <div className='flex items-center'>
          <span className='mr-2'>Card showing</span>
          <MetricTypeDropdown onSelect={writeOption} />
          <MetricSubtypeDropdown onSelect={writeOption} />

          {isPathAnalysis && (
            <>
              <span className='mx-3'></span>
              <Select
                name='startType'
                options={[
                  { value: 'start', label: 'With Start Point' },
                  { value: 'end', label: 'With End Point' }
                ]}
                defaultValue={metric.startType}
                // value={metric.metricOf}
                onChange={writeOption}
                placeholder='All Issues'
              />

              <span className='mx-3'>showing</span>
              <Select
                name='metricValue'
                options={[
                  { value: 'location', label: 'Pages' },
                  { value: 'click', label: 'Clicks' },
                  { value: 'input', label: 'Input' },
                  { value: 'custom', label: 'Custom' },
                ]}
                defaultValue={metric.metricValue}
                isMulti={true}
                // value={metric.metricValue}
                onChange={writeOption}
                placeholder='All Issues'
              />
            </>
          )}

          {metric.metricOf === FilterKey.ISSUE && metric.metricType === TABLE && (
            <>
              <span className='mx-3'>issue type</span>
              <Select
                name='metricValue'
                options={issueOptions}
                value={metric.metricValue}
                onChange={writeOption}
                isMulti={true}
                placeholder='All Issues'
              />
            </>
          )}

          {metric.metricType === INSIGHTS && (
            <>
              <span className='mx-3'>of</span>
              <Select
                name='metricValue'
                options={issueCategories}
                value={metric.metricValue}
                onChange={writeOption}
                isMulti={true}
                placeholder='All Categories'
              />
            </>
          )}

          {metric.metricType === 'table' &&
            !(metric.metricOf === FilterKey.ERRORS || metric.metricOf === FilterKey.SESSIONS) && (
              <>
                <span className='mx-3'>showing</span>
                <Select
                  name='metricFormat'
                  options={[{ value: 'sessionCount', label: 'Session Count' }]}
                  defaultValue={metric.metricFormat}
                  onChange={writeOption}
                />
              </>
            )}
        </div>
      </div>

      {isPathAnalysis && (
        <div className='form-group flex flex-col'>
          {metric.startType === 'start' ? 'Start Point' : 'End Point'}

          <FilterItem
            hideDelete={true}
            filter={metric.startPoint}
            allowedFilterKeys={[FilterKey.LOCATION, FilterKey.CLICK, FilterKey.INPUT, FilterKey.CUSTOM]}
            onUpdate={(val) => {
              metric.updateStartPoint(val);
            }} onRemoveFilter={() => {
          }} />
        </div>
      )}

      {isPredefined && (
        <div className='flex items-center my-6 justify-center'>
          <Icon name='info-circle' size='18' color='gray-medium' />
          <div className='ml-2'>
            Filtering and drill-downs will be supported soon for this card type.
          </div>
        </div>
      )}

      {!isPredefined && (
        <div className='form-group'>
          <div className='flex items-center font-medium py-2'>
            {`${isTable || isFunnel || isClickmap || isInsights || isPathAnalysis || isRetention ? 'Filter by' : 'Chart Series'}`}
            {!isTable && !isFunnel && !isClickmap && !isInsights && !isPathAnalysis && !isRetention && (
              <Button
                className='ml-2'
                variant='text-primary'
                onClick={() => metric.addSeries()}
                disabled={!canAddSeries}
              >
                ADD
              </Button>
            )}
          </div>

          {metric.series.length > 0 &&
            metric.series
              .slice(0, isTable || isFunnel || isClickmap || isInsights || isRetention ? 1 : metric.series.length)
              .map((series: any, index: number) => (
                <div className='mb-2' key={series.name}>
                  <FilterSeries
                    canExclude={isPathAnalysis}
                    supportsEmpty={!isClickmap && !isPathAnalysis}
                    excludeFilterKeys={excludeFilterKeys}
                    observeChanges={() => metric.updateKey('hasChanged', true)}
                    hideHeader={isTable || isClickmap || isInsights || isPathAnalysis || isFunnel}
                    seriesIndex={index}
                    series={series}
                    onRemoveSeries={() => metric.removeSeries(index)}
                    canDelete={metric.series.length > 1}
                    emptyMessage={
                      isTable
                        ? 'Filter data using any event or attribute. Use Add Step button below to do so.'
                        : 'Add user event or filter to define the series by clicking Add Step.'
                    }
                  />
                </div>
              ))}
        </div>
      )}

      <div className='form-groups flex items-center justify-between'>
        <Tooltip
          title='Cannot save funnel metric without at least 2 events'
          disabled={!cannotSaveFunnel}
        >
          <div className='flex items-center'>
            <Button variant='primary' onClick={onSave} disabled={isSaving || cannotSaveFunnel}>
              {metric.exists()
                ? 'Update'
                : parseInt(dashboardId) > 0
                  ? 'Create & Add to Dashboard'
                  : 'Create'}
            </Button>
            {metric.exists() && metric.hasChanged && (
              <Button onClick={undoChanges} variant='text' icon='arrow-counterclockwise' className='ml-2'>
                Undo
              </Button>
            )}
          </div>
        </Tooltip>
        <div className='flex items-center'>
          {metric.exists() && (
            <Button variant='text-primary' onClick={onDelete}>
              <Icon name='trash' size='14' className='mr-2' color='teal' />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default observer(WidgetForm);

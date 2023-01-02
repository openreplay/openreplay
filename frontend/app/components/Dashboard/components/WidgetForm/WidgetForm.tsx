import React from 'react';
import { metricOf, issueOptions } from 'App/constants/filterOptions';
import { FilterKey } from 'Types/filter/filterType';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Button, Icon, confirm, Tooltip } from 'UI';
import FilterSeries from '../FilterSeries';
import Select from 'Shared/Select';
import { withSiteId, dashboardMetricDetails, metricDetails } from 'App/routes';
import MetricTypeDropdown from './components/MetricTypeDropdown';
import MetricSubtypeDropdown from './components/MetricSubtypeDropdown';
import { TIMESERIES, TABLE, CLICKMAP, FUNNEL, ERRORS, RESOURCE_MONITORING, PERFORMANCE, WEB_VITALS } from 'App/constants/card';
import { clickmapFilter } from 'App/types/filter/newFilter';
import { renderClickmapThumbnail } from './renderMap'

interface Props {
  history: any;
  match: any;
  onDelete: () => void;
}

function WidgetForm(props: Props) {
  const {
    history,
    match: {
      params: { siteId, dashboardId },
    },
  } = props;
  const { metricStore, dashboardStore } = useStore();
  const isSaving = metricStore.isSaving;
  const metric: any = metricStore.instance;

  const timeseriesOptions = metricOf.filter((i) => i.type === 'timeseries');
  const tableOptions = metricOf.filter((i) => i.type === 'table');
  const isTable = metric.metricType === 'table';
  const isClickmap = metric.metricType === CLICKMAP
  const isFunnel = metric.metricType === 'funnel';
  const canAddSeries = metric.series.length < 3;
  const eventsLength = metric.series[0].filter.filters.filter((i: any) => i.isEvent).length;
  const cannotSaveFunnel = isFunnel && (!metric.series[0] || eventsLength <= 1);
  const isPredefined = metric.metricType === ERRORS || metric.metricType === PERFORMANCE || metric.metricType === RESOURCE_MONITORING || metric.metricType === WEB_VITALS;

  const writeOption = ({ value, name }: { value: any; name: any }) => {
    value = Array.isArray(value) ? value : value.value;
    const obj: any = { [name]: value };
  
    if (name === 'metricValue') {
      obj.metricValue = value;
  
      if (Array.isArray(obj.metricValue) && obj.metricValue.length > 1) {
        obj.metricValue = obj.metricValue.filter((i: any) => i.value !== 'all');
      }
    }
  
    if (name === 'metricType') {
      switch (value) {
        case TIMESERIES:
          obj.metricOf = timeseriesOptions[0].value;
          obj.viewType = 'lineChart';
          break;
        case TABLE:
          obj.metricOf = tableOptions[0].value;
          obj.viewType = 'table';
          break;
        case FUNNEL:
          obj.metricOf = 'sessionCount';
          break;
        case ERRORS:
        case RESOURCE_MONITORING:
        case WEB_VITALS:
          obj.viewType = 'chart';
          break;
        case CLICKMAP:
          obj.viewType = 'chart';

          if (value !== CLICKMAP) {
            metric.series[0].filter.removeFilter(0)
          }

          if (metric.series[0].filter.filters.length < 1) {
            metric.series[0].filter.addFilter({
              ...clickmapFilter,
              value: [''],
            });
          }
          break;
      }
    }
    metricStore.merge(obj);
  };

  const onSave = async () => {
    const wasCreating = !metric.exists();
    if (isClickmap) {
      try {
        metric.thumbnail = await renderClickmapThumbnail()
      } catch (e) {
        console.error(e)
      }
    }
    metricStore.save(metric).then((metric: any) => {
      if (wasCreating) {
        if (parseInt(dashboardId) > 0) {
          history.replace(withSiteId(dashboardMetricDetails(dashboardId, metric.metricId), siteId));
          const dashboard = dashboardStore.getDashboard(parseInt(dashboardId));
          if (dashboard) {
            dashboardStore.addWidgetToDashboard(dashboard, [metric.metricId]);
          }
        } else {
          history.replace(withSiteId(metricDetails(metric.metricId), siteId));
        }
      }
    });
  };

  const onDelete = async () => {
    if (
      await confirm({
        header: 'Confirm',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to permanently delete this metric?`,
      })
    ) {
      metricStore.delete(metric).then(props.onDelete);
    }
  };

  return (
    <div className="p-6">
      <div className="form-group">
        <label className="font-medium">Metric Type</label>
        <div className="flex items-center">
          <MetricTypeDropdown onSelect={writeOption} />
          <MetricSubtypeDropdown onSelect={writeOption} />

          {metric.metricOf === FilterKey.ISSUE && (
            <>
              <span className="mx-3">issue type</span>
              <Select
                name="metricValue"
                options={issueOptions}
                value={metric.metricValue}
                onChange={writeOption}
                isMulti={true}
                placeholder="All Issues"
              />
            </>
          )}

          {metric.metricType === 'table' &&
            !(metric.metricOf === FilterKey.ERRORS || metric.metricOf === FilterKey.SESSIONS) && (
              <>
                <span className="mx-3">showing</span>
                <Select
                  name="metricFormat"
                  options={[{ value: 'sessionCount', label: 'Session Count' }]}
                  defaultValue={metric.metricFormat}
                  onChange={writeOption}
                />
              </>
            )}

        </div>
      </div>

      {isPredefined && (
        <div className="flex items-center my-6 justify-center">
          <Icon name="info-circle" size="18" color="gray-medium" />
          <div className="ml-2">Filtering or modification of OpenReplay provided metrics isn't supported at the moment.</div>
        </div>
      )}

      {!isPredefined && (
      <div className="form-group">
        <div className="flex items-center font-medium py-2">
          {`${isTable || isFunnel || isClickmap ? 'Filter by' : 'Chart Series'}`}
          {!isTable && !isFunnel && !isClickmap && (
            <Button
              className="ml-2"
              variant="text-primary"
              onClick={() => metric.addSeries()}
              disabled={!canAddSeries}
            >
              ADD
            </Button>
          )}
        </div>

        {metric.series.length > 0 &&
          metric.series
            .slice(0, isTable || isFunnel  || isClickmap ? 1 : metric.series.length)
            .map((series: any, index: number) => (
              <div className="mb-2" key={series.name}>
                <FilterSeries
                  observeChanges={() => metric.updateKey('hasChanged', true)}
                  hideHeader={isTable || isClickmap}
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

      <div className="form-groups flex items-center justify-between">
        <Tooltip
          title="Cannot save funnel metric without at least 2 events"
          disabled={!cannotSaveFunnel}
        >
          <Button variant="primary" onClick={onSave} disabled={isSaving || cannotSaveFunnel}>
            {metric.exists() ? 'Update' : (parseInt(dashboardId) > 0 ? 'Create & Add to Dashboard' : 'Create')}
          </Button>
        </Tooltip>
        <div className="flex items-center">
          {metric.exists() && (
            <Button variant="text-primary" onClick={onDelete}>
              <Icon name="trash" size="14" className="mr-2" color="teal" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default observer(WidgetForm);

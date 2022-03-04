import React from 'react';
import { Form, Button, IconButton } from 'UI';
import FilterSeries from '../FilterSeries';
import { connect } from 'react-redux';
import { edit as editMetric, save, addSeries, removeSeries, remove } from 'Duck/customMetrics';
import CustomMetricWidgetPreview from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricWidgetPreview';
import { confirm } from 'UI/Confirmation';
import { toast } from 'react-toastify';
import cn from 'classnames';
import DropdownPlain from '../../DropdownPlain';
import { metricTypes, metricOf, issueOptions } from 'App/constants/filterOptions';
import { FilterKey } from 'Types/filter/filterType';
interface Props {
  metric: any;
  editMetric: (metric, shouldFetch?) => void;
  save: (metric) => Promise<void>;
  loading: boolean;
  addSeries: (series?) => void;
  onClose: () => void;
  remove: (id) => Promise<void>;
  removeSeries: (seriesIndex) => void;
}

function CustomMetricForm(props: Props) {
  const { metric, loading } = props;
  // const metricOfOptions = metricOf.filter(i => i.key === metric.metricType);
  const timeseriesOptions = metricOf.filter(i => i.type === 'timeseries');
  const tableOptions = metricOf.filter(i => i.type === 'table');
  const isTable = metric.metricType === 'table';
  const isTimeSeries = metric.metricType === 'timeseries';
  const _issueOptions = [{ text: 'All', value: 'all' }].concat(issueOptions);


  const addSeries = () => {
    props.addSeries();
  }

  const removeSeries = (index) => {
    props.removeSeries(index);
  }

  const write = ({ target: { value, name } }) => props.editMetric({ [ name ]: value }, false);
  const writeOption = (e, { value, name }) => {
    props.editMetric({ [ name ]: value }, false);

    if (name === 'metricValue') {
      props.editMetric({ metricValue: [value] }, false);
    }

    if (name === 'metricOf') {
      if (value === FilterKey.ISSUE) {
        props.editMetric({ metricValue: ['all'] }, false);
      }
    }

    if (name === 'metricType') {
      if (value === 'timeseries') {
        props.editMetric({ metricOf: timeseriesOptions[0].value, viewType: 'lineChart' }, false);
      } else if (value === 'table') {
        props.editMetric({ metricOf: tableOptions[0].value, viewType: 'table' }, false);
      }
    }
  };

  // const changeConditionTab = (e, { name, value }) => {
  //   props.editMetric({[ 'viewType' ]: value });
  // };

  const save = () => {
    props.save(metric).then(() => {
      toast.success(metric.exists() ? 'Updated succesfully.' : 'Created succesfully.');
      props.onClose()
    });
  }

  const deleteHandler = async () => {
    if (await confirm({
      header: 'Custom Metric',
      confirmButton: 'Delete',
      confirmation: `Are you sure you want to delete ${metric.name}`
    })) {
      props.remove(metric.metricId).then(() => {
        toast.success('Deleted succesfully.');
        props.onClose();
      });
    }
  }

  return (
    <Form
      className="relative"
      onSubmit={save}
    >
      <div className="p-5 pb-20" style={{ height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
        <div className="form-group">
          <label className="font-medium">Metric Title</label>
          <input
            autoFocus={ true }
            className="text-lg"
            name="name"
            style={{ fontSize: '18px', padding: '10px', fontWeight: '600'}}
            value={ metric.name }
            onChange={ write }
            placeholder="Metric Title"
            id="name-field"
          />
        </div>

        <div className="form-group">
          <label className="font-medium">Metric Type</label>
          <div className="flex items-center">
            <DropdownPlain
              name="metricType"
              options={metricTypes}
              value={ metric.metricType }
              onChange={ writeOption }
            />

            {metric.metricType === 'timeseries' && (
             <>
               <span className="mx-3">of</span>
                <DropdownPlain
                  name="metricOf"
                  options={timeseriesOptions}
                  value={ metric.metricOf }
                  onChange={ writeOption }
                />
             </>
            )}

            {metric.metricType === 'table' && (
             <>
               <span className="mx-3">of</span>
                <DropdownPlain
                  name="metricOf"
                  options={tableOptions}
                  value={ metric.metricOf }
                  onChange={ writeOption }
                />
             </>
            )}

            {metric.metricOf === FilterKey.ISSUE && (
              <>
                <span className="mx-3">issue type</span>
                <DropdownPlain
                  name="metricValue"
                  options={_issueOptions}
                  value={ metric.metricValue[0] }
                  onChange={ writeOption }
                />
              </>
            )}

            {metric.metricType === 'table' && (
              <>
                <span className="mx-3">showing</span>
                <DropdownPlain
                  name="metricFormat"
                  options={[
                    { value: 'sessionCount', text: 'Session Count' },
                  ]}
                  value={ metric.metricFormat }
                  onChange={ writeOption }
                />
              </>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="font-medium">
            {`${isTable ? 'Filter by' : 'Chart Series'}`}
          </label>
          {metric.series && metric.series.size > 0 && metric.series.take(isTable ? 1 : metric.series.size).map((series: any, index: number) => (
            <div className="mb-2">
              <FilterSeries
                hideHeader={ isTable }
                seriesIndex={index}
                series={series}
                onRemoveSeries={() => removeSeries(index)}
                canDelete={metric.series.size > 1}
                emptyMessage={isTable ?
                    'Filter table data by user environment and metadata attributes. Use add step button below to filter.' :
                    'Add user event or filter to define the series by clicking Add Step.'
                  }
              />
            </div>
          ))}
        </div>

        { isTimeSeries && (  
          <div className={cn("flex justify-end -my-4", {'disabled' : metric.series.size > 2})}>
            <IconButton hover type="button" onClick={addSeries} primaryText label="SERIES" icon="plus" />
          </div>
        )}

        <div className="my-8" />

        <CustomMetricWidgetPreview metric={metric} />
      </div>

      <div className="flex items-center fixed border-t w-full bottom-0 px-5 py-2 bg-white">
        <div className="mr-auto">
          <Button loading={loading} primary disabled={!metric.validate()}>
            { `${metric.exists() ? 'Update' : 'Create'}` }
          </Button>

          <Button type="button" className="ml-3" outline hover plain onClick={props.onClose}>Cancel</Button>
        </div>
        <div>
          { metric.exists() && <Button type="button" className="ml-3" outline hover plain onClick={deleteHandler}>Delete</Button> }
        </div>
      </div>
    </Form>
  );
}

export default connect(state => ({
  metric: state.getIn(['customMetrics', 'instance']),
  loading: state.getIn(['customMetrics', 'saveRequest', 'loading']),
}), { editMetric, save, addSeries, remove, removeSeries })(CustomMetricForm);
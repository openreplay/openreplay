import React from 'react';
import { Form, SegmentSelection, Button, IconButton } from 'UI';
import FilterSeries from '../FilterSeries';
import { connect } from 'react-redux';
import { edit as editMetric, save, addSeries, removeSeries, remove } from 'Duck/customMetrics';
import CustomMetricWidgetPreview from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricWidgetPreview';
import { confirm } from 'UI/Confirmation';
import { toast } from 'react-toastify';
import cn from 'classnames';

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

  const addSeries = () => {
    props.addSeries();
  }

  const removeSeries = (index) => {
    props.removeSeries(index);
  }

  const write = ({ target: { value, name } }) => props.editMetric({ ...metric, [ name ]: value }, false);

  const changeConditionTab = (e, { name, value }) => {
    props.editMetric({[ 'viewType' ]: value });
  };

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
            <span className="bg-white p-1 px-2 border rounded" style={{ height: '30px'}}>Timeseries</span>
            <span className="mx-2 color-gray-medium">of</span>
            <div>
              <SegmentSelection
                primary
                name="viewType"
                small={true}
                // className="my-3"
                onSelect={ changeConditionTab }
                value={{ value: metric.viewType }}
                list={ [
                  { name: 'Session Count', value: 'lineChart' },
                  { name: 'Session Percentage', value: 'progress', disabled: true },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="font-medium">Chart Series</label>
          {metric.series && metric.series.size > 0 && metric.series.map((series: any, index: number) => (
            <div className="mb-2">
              <FilterSeries
                seriesIndex={index}
                series={series}
                onRemoveSeries={() => removeSeries(index)}
                canDelete={metric.series.size > 1}
              />
            </div>
          ))}
        </div>

        <div className={cn("flex justify-end -my-4", {'disabled' : metric.series.size > 2})}>
          <IconButton hover type="button" onClick={addSeries} primaryText label="SERIES" icon="plus" />
        </div>

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
import React from 'react';
import { Form, SegmentSelection, Button, IconButton } from 'UI';
import FilterSeries from '../FilterSeries';
import { connect } from 'react-redux';
import { edit as editMetric, save, addSeries } from 'Duck/customMetrics';
import CustomMetricWidgetPreview from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricWidgetPreview';

interface Props {
  metric: any;
  editMetric: (metric) => void;
  save: (metric) => Promise<void>;
  loading: boolean;
  addSeries: (series?) => void;
  onClose: () => void;
}

function CustomMetricForm(props: Props) {
  const { metric, loading } = props;

  const addSeries = () => {
    props.addSeries();
    const newSeries = {
      name: `Series ${metric.series.size + 1}`,
      type: '',
      // series: [],
      filter: {
        type: '',
        value: '',
        filters: [],
      },
    };
    props.editMetric({
      ...metric,
      series: metric.series.concat(newSeries),
    });
  }

  const removeSeries = (index) => {
    const newSeries = metric.series.filter((_series, i) => {
      return i !== index;
    });
    props.editMetric({
      ...metric,
      series: newSeries,
    });
  }

  const write = ({ target: { value, name } }) => props.editMetric({ ...metric, [ name ]: value })

  const changeConditionTab = (e, { name, value }) => {
    props.editMetric({[ 'type' ]: value });
  };

  const save = () => {
    props.save(metric).then(props.onClose);
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
            <span className="bg-white p-1 px-2 border rounded">Timeseries</span>
            <span className="mx-2 color-gray-medium">of</span>
            <div>
              <SegmentSelection
                primary
                name="condition"
                small={true}
                // className="my-3"
                onSelect={ changeConditionTab }
                value={{ value: metric.type }}
                list={ [
                  { name: 'Session Count', value: 'session_count' },
                  { name: 'Session Percentage', value: 'session_percentage' },
                ]}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="font-medium">Series</label>
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

        <div className="flex justify-end">
          <IconButton type="button" onClick={addSeries} primaryText label="SERIES" icon="plus" />
        </div>

        <div className="my-4" />

        <CustomMetricWidgetPreview metric={metric} />
      </div>

      <div className="fixed border-t w-full bottom-0 px-5 py-2 bg-white">
        <Button loading={loading} primary disabled={!metric.validate()}>
          { `${metric.exists() ? 'Update' : 'Create'}` }
        </Button>
      </div>
    </Form>
  );
}

export default connect(state => ({
  metric: state.getIn(['customMetrics', 'instance']),
  loading: state.getIn(['customMetrics', 'saveRequest', 'loading']),
}), { editMetric, save, addSeries })(CustomMetricForm);
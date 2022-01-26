import CustomMetricWidgetPreview from 'App/components/Dashboard/Widgets/CustomMetricsWidgets/CustomMetricWidgetPreview';
import React, { useState } from 'react';
import { IconButton, SlideModal } from 'UI'
import CustomMetricForm from './CustomMetricForm';
import { connect } from 'react-redux';
import { edit } from 'Duck/customMetrics';

interface Props {
  metric: any;
  edit: (metric) => void;
}
function CustomMetrics(props: Props) {
  const { metric } = props;
  const [showModal, setShowModal] = useState(false);

  const onClose = () => {
    setShowModal(false);
  }

  return (
    <div className="self-start">
      <IconButton outline icon="plus" label="CREATE METRIC" onClick={() => {
        setShowModal(true);
        // props.edit({ name: 'New', series: [{ name: '', filter: {} }], type: '' });
      }} />

      <SlideModal
        title={
          <div className="flex items-center">
            <span className="mr-3">{ 'Custom Metric' }</span>
          </div>
        }
        isDisplayed={ showModal }
        onClose={ () => setShowModal(false)}
        // size="medium"
        content={ (showModal || metric) && (
          <div style={{ backgroundColor: '#f6f6f6' }}>
            <CustomMetricForm metric={metric} />
          </div>
        )}
      />
    </div>
  );
}

export default connect(state => ({
  metric: state.getIn(['customMetrics', 'instance']),
  alertInstance: state.getIn(['alerts', 'instance']),
}), { edit })(CustomMetrics);
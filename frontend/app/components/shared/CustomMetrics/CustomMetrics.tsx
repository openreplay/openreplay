import React, { useState } from 'react';
import { IconButton, SlideModal } from 'UI';
import CustomMetricForm from './CustomMetricForm';
import { connect } from 'react-redux';
import { edit, init } from 'Duck/customMetrics';

interface Props {
  metric: any;
  edit: (metric) => void;
  instance: any;
  init: (instance?, setDefault?) => void;
}
function CustomMetrics(props: Props) {
  const { metric } = props;

  return (
    <div className="self-start">
      <IconButton plain outline icon="plus" label="CREATE METRIC" onClick={() => props.init()} />

      <SlideModal
        title={
          <div className="flex items-center">
            <span className="mr-3">{ metric && metric.exists() ? 'Update Custom Metric' : 'Create Custom Metric' }</span>
          </div>
        }
        isDisplayed={ !!metric }
        onClose={ () => props.init(null, true)}
        content={ (!!metric) && (
          <div style={{ backgroundColor: '#f6f6f6' }}>
            <CustomMetricForm metric={metric} onClose={() => props.init(null, true)} />
          </div>
        )}
      />
    </div>
  );
}

export default connect(state => ({
  metric: state.getIn(['customMetrics', 'instance']),
  alertInstance: state.getIn(['alerts', 'instance']),
  showModal: state.getIn(['customMetrics', 'showModal']),
}), { edit, init })(CustomMetrics);
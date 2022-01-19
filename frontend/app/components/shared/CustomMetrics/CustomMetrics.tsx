import React, { useState } from 'react';
import { IconButton, SlideModal } from 'UI'
import CustomMetricForm from './CustomMetricForm';

interface Props {}
function CustomMetrics(props: Props) {
  const [showModal, setShowModal] = useState(true);

  return (
    <div className="self-start">
      <IconButton outline icon="plus" label="CREATE METRIC" onClick={() => setShowModal(true)} />

      <SlideModal
        title={
          <div className="flex items-center">
            <span className="mr-3">{ 'Custom Metric' }</span>
          </div>
        }
        isDisplayed={ showModal }
        onClose={ () => setShowModal(false)}
        // size="medium"
        content={ showModal && (
          <div style={{ backgroundColor: '#f6f6f6'}}>
            <CustomMetricForm />
          </div>
        )}
      />
    </div>
  );
}

export default CustomMetrics;
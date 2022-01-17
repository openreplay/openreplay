import React from 'react';
import { IconButton, SlideModal } from 'UI'
import CustomMetricForm from './CustomMetricForm';

interface Props {}
function CustomMetrics(props: Props) {
  return (
    <div>
      <IconButton outline icon="plus" label="CREATE METRIC" />

      <SlideModal
        title={
          <div className="flex items-center">
            <span className="mr-3">{ 'Custom Metric' }</span>
            {/* <IconButton 
              circle
              size="small"
              icon="plus" 
              outline
              id="add-button"
              // onClick={ () => toggleForm({}, true) }
            /> */}
          </div>
        }
        isDisplayed={ true }
        // onClose={ () => {
        //   toggleForm({}, false);
        //   setShowAlerts(false);
        // } }
        // size="medium"
        content={
          <div className="bg-gray-light-shade">
            <CustomMetricForm />
          </div>
        }
      />
    </div>
  );
}

export default CustomMetrics;
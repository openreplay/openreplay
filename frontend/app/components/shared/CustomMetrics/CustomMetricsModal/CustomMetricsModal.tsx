import React from 'react'
import { IconButton, SlideModal } from 'UI';
import CustomMetricForm from '../CustomMetricForm';
import { connect } from 'react-redux'
import { init } from 'Duck/customMetrics';

interface Props {
    metric: any;
    init: (instance?, setDefault?) => void;
}
function CustomMetricsModal(props: Props) {
    const { metric } = props;
    return (
        <>
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
        </>
    )
}


export default connect(state => ({
    metric: state.getIn(['customMetrics', 'instance']),
    alertInstance: state.getIn(['alerts', 'instance']),
    showModal: state.getIn(['customMetrics', 'showModal']),
  }), { init })(CustomMetricsModal);
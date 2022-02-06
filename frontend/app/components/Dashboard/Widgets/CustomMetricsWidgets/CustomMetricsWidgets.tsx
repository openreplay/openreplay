import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { fetchList } from 'Duck/customMetrics';
import CustomMetricWidget from './CustomMetricWidget';
import AlertFormModal from 'App/components/Alerts/AlertFormModal';

interface Props {
  fetchList: Function;
  list: any;
  onClickEdit: (e) => void;
}
function CustomMetricsWidgets(props: Props) {
  const { list } = props;
  const [activeMetricId, setActiveMetricId] = useState(null);

  useEffect(() => {
    props.fetchList()
  }, [])

  console.log('activeMetricId', activeMetricId)

  return (
    <>
      {list.map((item: any) => (
        <CustomMetricWidget
          metric={item}
          onClickEdit={props.onClickEdit}
          onAlertClick={(e) => setActiveMetricId(item.metricId)}
        />
      ))}

      <AlertFormModal
        showModal={!!activeMetricId}
        metricId={activeMetricId}
        onClose={() => setActiveMetricId(null)}
      />
    </>
  );
}

export default connect(state => ({
  list: state.getIn(['customMetrics', 'list']),
}), { fetchList })(CustomMetricsWidgets);
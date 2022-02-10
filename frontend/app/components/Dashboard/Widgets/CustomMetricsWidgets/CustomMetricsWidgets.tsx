import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { fetchList } from 'Duck/customMetrics';
import CustomMetricWidget from './CustomMetricWidget';
import AlertFormModal from 'App/components/Alerts/AlertFormModal';
import { init as initAlert } from 'Duck/alerts';
import LazyLoad from 'react-lazyload';

interface Props {
  fetchList: Function;
  list: any;
  onClickEdit: (e) => void;
  initAlert: Function;
}
function CustomMetricsWidgets(props: Props) {
  const { list } = props;
  const [activeMetricId, setActiveMetricId] = useState(null);

  useEffect(() => {
    props.fetchList()
  }, [])

  return (
    <>
      {list.filter(item => item.active).map((item: any) => (
        <LazyLoad>
          <CustomMetricWidget
            key={item.metricId}
            metric={item}
            onClickEdit={props.onClickEdit}
            onAlertClick={(e) => {
              setActiveMetricId(item.metricId)
              props.initAlert({ query: { left: item.series.first().seriesId }})
            }}
          />
        </LazyLoad>
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
}), { fetchList, initAlert })(CustomMetricsWidgets);
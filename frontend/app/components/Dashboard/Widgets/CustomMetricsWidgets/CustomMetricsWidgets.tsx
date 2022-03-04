import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { fetchList } from 'Duck/customMetrics';
import CustomMetricWidget from './CustomMetricWidget';
import AlertFormModal from 'App/components/Alerts/AlertFormModal';
import { init as initAlert } from 'Duck/alerts';
import LazyLoad from 'react-lazyload';
import CustomMetrics from 'App/components/shared/CustomMetrics';

interface Props {
  fetchList: Function;
  list: any;
  onClickEdit: (e) => void;
  initAlert: Function;
}
function CustomMetricsWidgets(props: Props) {
  const { list } = props;
  const [activeMetricId, setActiveMetricId] = useState(null);
  const activeList = list.filter(item => item.active);

  useEffect(() => {
    props.fetchList()
  }, [])

  return (
    <>
      <div className="gap-4 grid grid-cols-2">
        {activeList.map((item: any) => (
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
      </div>

      {list.size === 0 && (
        <div className="flex items-center py-2">
          <div className="mr-2 color-gray-medium">Be proactive by monitoring the metrics you care about the most.</div>
          <CustomMetrics />
        </div>
      )}

      {list.size > 0 && activeList && activeList.size === 0 && (
        <div className="flex items-center py-2">
          <div className="mr-2 color-gray-medium">It's blank here, add a metric to this section.</div>
        </div>
      )}

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
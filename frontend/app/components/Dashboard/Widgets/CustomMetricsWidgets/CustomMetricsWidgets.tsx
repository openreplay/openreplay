import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { fetchList } from 'Duck/customMetrics';
import { list } from 'App/components/BugFinder/CustomFilters/filterModal.css';
import CustomMetricWidget from './CustomMetricWidget';

interface Props {
  fetchList: Function;
  list: any;
}
function CustomMetricsWidgets(props: Props) {
  const { list } = props;

  useEffect(() => {
    props.fetchList()
  }, [])

  return (
    <>
      {list.map((item: any) => (
        <CustomMetricWidget widget={item} />
      ))}
    </>
  );
}

export default connect(state => ({
  list: state.getIn(['customMetrics', 'list']),
}), { fetchList })(CustomMetricsWidgets);
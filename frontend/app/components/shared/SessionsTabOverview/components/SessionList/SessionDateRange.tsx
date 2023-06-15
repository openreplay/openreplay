import React from 'react';
import { connect } from 'react-redux';
import Period from 'Types/app/period';
import { applyFilter } from 'Duck/search';
import SelectDateRange from 'Shared/SelectDateRange';

interface Props {
  filter: any;
  applyFilter: (filter: any) => void;
}
function SessionDateRange(props: Props) {
  const {
    filter: { startDate, endDate, rangeValue },
  } = props;
  const period = Period({ start: startDate, end: endDate, rangeName: rangeValue });
  const isCustom = period.rangeName === 'CUSTOM_RANGE'
  const onDateChange = (e: any) => {
    const dateValues = e.toJSON();
    props.applyFilter(dateValues);
  };
  return (
    <div className="flex items-center">
      <span className="mr-1">No sessions {isCustom ? 'between' : 'in the'}</span>
      <div className="border rounded"><SelectDateRange period={period} onChange={onDateChange} right={true} /></div>
    </div>
  );
}

export default connect(
  (state: any) => ({
    filter: state.getIn(['search', 'instance']),
  }),
  { applyFilter }
)(SessionDateRange);
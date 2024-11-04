import React from 'react';
import { connect } from 'react-redux';
import { applyFilter, fetchList } from 'Duck/filters';
import { fetchList as fetchFunnelsList } from 'Duck/funnels';
import DateRangeDropdown from 'Shared/DateRangeDropdown';

@connect(state => ({
  rangeValue: state.getIn([ 'filters', 'appliedFilter', 'rangeValue' ]),
  startDate: state.getIn([ 'filters', 'appliedFilter', 'startDate' ]),
  endDate: state.getIn([ 'filters', 'appliedFilter', 'endDate' ]),
}), {
  applyFilter, fetchList, fetchFunnelsList
})
export default class DateRange extends React.PureComponent {  
  render() {
    const { startDate, endDate, rangeValue, className } = this.props;
    return (
      <DateRangeDropdown
        button
        // onChange={ this.onDateChange }
        rangeValue={ rangeValue }
        startDate={ startDate }
        endDate={ endDate }
        className={ className }
      />
    );
  }
}
import { connect } from 'react-redux';
// import { applyFilter } from 'Duck/filters';
import { applyFilter } from 'Duck/search';
import { fetchList as fetchFunnelsList } from 'Duck/funnels';
import DateRangeDropdown from 'Shared/DateRangeDropdown';

@connect(state => ({
  rangeValue: state.getIn([ 'filters', 'appliedFilter', 'rangeValue' ]),
  startDate: state.getIn([ 'filters', 'appliedFilter', 'startDate' ]),
  endDate: state.getIn([ 'filters', 'appliedFilter', 'endDate' ]),
}), {
  applyFilter, fetchFunnelsList
})
export default class DateRange extends React.PureComponent {
  onDateChange = (e) => {
    console.log('onDateChange', e);
    this.props.fetchFunnelsList(e.rangeValue)
    this.props.applyFilter(e)
  }
  render() {
    const { startDate, endDate, rangeValue, className } = this.props;
    return (
      <DateRangeDropdown
        button
        onChange={ this.onDateChange }
        rangeValue={ rangeValue }
        startDate={ startDate }
        endDate={ endDate }
        className={ className }
      />
    );
  }
}
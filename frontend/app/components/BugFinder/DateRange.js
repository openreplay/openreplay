import { connect } from 'react-redux';
import { applyFilter } from 'Duck/search';
import { fetchList as fetchFunnelsList } from 'Duck/funnels';
import DateRangeDropdown from 'Shared/DateRangeDropdown';

@connect(state => ({
  filter: state.getIn([ 'search', 'instance' ]),
}), {
  applyFilter, fetchFunnelsList
})
export default class DateRange extends React.PureComponent {
  onDateChange = (e) => {
    // this.props.fetchFunnelsList(e.rangeValue)
    this.props.applyFilter(e)
  }
  render() {
    const { filter: { rangeValue, startDate, endDate }, className } = this.props;
    
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
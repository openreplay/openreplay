import { connect } from 'react-redux';
// import { applyFilter } from 'Duck/filters';
import { applyFilter } from 'Duck/search';
import { fetchList as fetchFunnelsList } from 'Duck/funnels';
import DateRangeDropdown from 'Shared/DateRangeDropdown';

@connect(state => ({
  filter: state.getIn([ 'search', 'instance' ]),
  // rangeValue: state.getIn([ 'search', 'instance', 'rangeValue' ]),
  // startDate: state.getIn([ 'search', 'instance', 'startDate' ]),
  // endDate: state.getIn([ 'search', 'instance', 'endDate' ]),
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
    const { filter: { rangeValue, startDate, endDate }, className } = this.props;
    // const { startDate, endDate, rangeValue, className } = this.props;
    
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
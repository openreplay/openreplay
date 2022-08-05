import { Duration } from 'luxon';
import { connect } from 'react-redux';

function TimeTooltip({ time }: { time: number }) {
  const duration = Duration.fromMillis(time).toFormat('mm:ss')
  return (duration)
}

export default connect(state => ({ time: state.getIn([ 'sessions', 'timelineHoverPointerTime'])}))(TimeTooltip);

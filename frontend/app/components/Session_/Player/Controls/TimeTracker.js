import { connectPlayer } from 'Player';
import styles from './timeTracker.css';


const TimeTracker = ({ time, scale }) => (
	<React.Fragment>
		<div
      className={ styles.positionTracker }
      style={ { left: `${ time * scale }%` } }
    />
    <span
    	className={ styles.playedTimeline } 
    	style={ { width: `${ time * scale }%` } }
    />
	</React.Fragment>
);

TimeTracker.displayName = 'TimeTracker';

export default connectPlayer(state => ({
  time: state.time,
}))(TimeTracker);
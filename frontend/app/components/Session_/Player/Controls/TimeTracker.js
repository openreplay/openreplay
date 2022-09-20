import React from 'react';
import { connectPlayer } from 'Player';
import styles from './timeTracker.module.css';
import cn from 'classnames'

const TimeTracker = ({ time, scale, live, left }) => (
	<React.Fragment>
    <span
    	className={ cn(styles.playedTimeline, live && left > 99 ? styles.liveTime : null) }
    	style={ { width: `${ time * scale }%` } }
    />
	</React.Fragment>
);

TimeTracker.displayName = 'TimeTracker';

export default connectPlayer(state => ({
  time: state.time,
}))(TimeTracker);

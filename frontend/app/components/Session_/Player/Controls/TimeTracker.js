import React from 'react';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import styles from './timeTracker.module.css';
import cn from 'classnames'

const TimeTracker = ({ scale, live = false, left }) => {
	const { store } = React.useContext(PlayerContext)
	const time = store.get().time

  return (
	<React.Fragment>
    <span
    	className={ cn(styles.playedTimeline, live && left > 99 ? styles.liveTime : null) }
    	style={ { width: `${ time * scale }%` } }
    />
	</React.Fragment>
);}

TimeTracker.displayName = 'TimeTracker';

export default observer(TimeTracker);

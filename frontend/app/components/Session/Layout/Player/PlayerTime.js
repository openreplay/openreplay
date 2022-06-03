import React from 'react';
import { observer } from 'mobx-react-lite';
import { Duration } from 'luxon';
import styles from './playerTime.module.css';

function PlayerTime({ player, timeKey }) {
	return (
	  <div className={ styles.time }>
	    { Duration.fromMillis(player.state[timeKey]).toFormat('m:ss') }
	  </div>
	);
}

export default observer(PlayerTime);


import React from 'react';
import { Duration } from 'luxon';
import { connectPlayer } from 'Player';
import styles from './time.module.css';

const Time = ({ time, isCustom }) => (
  <div className={ !isCustom && styles.time }>
    { Duration.fromMillis(time).toFormat('m:ss') }
  </div>
)

Time.displayName = "Time";


const ReduxTime = connectPlayer((state, { name }) => ({
  time: state[ name ],
}))(Time);

ReduxTime.displayName = "ReduxTime";

export default Time;
export { ReduxTime };

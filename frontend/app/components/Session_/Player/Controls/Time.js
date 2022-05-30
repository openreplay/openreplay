import React from 'react';
import { Duration } from 'luxon';
import { connectPlayer } from 'Player';
import styles from './time.module.css';

const Time = ({ time, isCustom, format = 'm:ss', }) => (
  <div className={ !isCustom && styles.time }>
    { Duration.fromMillis(time).toFormat(format) }
  </div>
)

Time.displayName = "Time";


const ReduxTime = connectPlayer((state, { name, format }) => ({
  time: state[ name ],
  format,
}))(Time);

ReduxTime.displayName = "ReduxTime";

export default Time;
export { ReduxTime };

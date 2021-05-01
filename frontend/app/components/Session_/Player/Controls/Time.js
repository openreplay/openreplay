import { Duration } from 'luxon';
import { connectPlayer } from 'Player';
import styles from './time.css';

const Time = ({ time }) => (
  <div className={ styles.time }>
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
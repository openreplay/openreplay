import React from 'react';
import { Duration } from 'luxon';
import { connectPlayer } from 'Player';
import styles from './time.module.css';

const Time = ({ time, isCustom, format = 'm:ss', }) => (
  <div className={ !isCustom ? styles.time : undefined }>
    { Duration.fromMillis(time).toFormat(format) }
  </div>
)

Time.displayName = "Time";

const ReduxTime = connectPlayer((state, { name, format }) => ({
  time: state[ name ],
  format,
}))(Time);

const AssistDurationCont = connectPlayer(
  state => {
    const assistStart = state.assistStart;
    return {
      assistStart,
    }
  }
)(({ assistStart }) => {
  const [assistDuration, setAssistDuration] = React.useState('00:00');
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAssistDuration(Duration.fromMillis(+new Date() - assistStart).toFormat('mm:ss'));
    }
    , 1000);
    return () => clearInterval(interval);
  }, [])
  return (
    <>
      Elapsed {assistDuration}
    </>
  )
})

const AssistDuration = React.memo(AssistDurationCont);

ReduxTime.displayName = "ReduxTime";

export default React.memo(Time);
export { ReduxTime, AssistDuration };

import React from 'react';
import { Duration } from 'luxon';
import styles from './time.module.css';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

const Time = ({ time, isCustom, format = 'm:ss', }) => (
  <div className={ !isCustom ? styles.time : undefined }>
    { Duration.fromMillis(time).toFormat(format) }
  </div>
)

Time.displayName = "Time";

const ReduxTime = observer(({ format, name, isCustom }) => {
  const { store } = React.useContext(PlayerContext)
  const time = store.get()[name]

  return <Time format={format} time={time} isCustom={isCustom} />
})

const AssistDurationCont = () => {
  const { store } = React.useContext(PlayerContext)
  const { assistStart } = store.get()

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
}

const AssistDuration = observer(AssistDurationCont)

ReduxTime.displayName = "ReduxTime";

export default React.memo(Time);
export { ReduxTime, AssistDuration };

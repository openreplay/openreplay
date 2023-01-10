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

ReduxTime.displayName = "ReduxTime";

export default React.memo(Time);
export { ReduxTime };

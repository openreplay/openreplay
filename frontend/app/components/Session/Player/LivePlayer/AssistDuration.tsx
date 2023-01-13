import React from 'react';
import { Duration } from 'luxon';
import { PlayerContext, ILivePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

const AssistDurationCont = () => {
  // @ts-ignore ??? TODO
  const { store } = React.useContext<ILivePlayerContext>(PlayerContext)
  const { assistStart } = store.get()

  const [assistDuration, setAssistDuration] = React.useState('00:00');
  React.useEffect(() => {
    const interval = setInterval(() => {
        setAssistDuration(Duration.fromMillis(+new Date() - assistStart).toFormat('mm:ss'));
      }
      , 500);
    return () => clearInterval(interval);
  }, [])
  return (
    <>
      Elapsed {assistDuration}
    </>
  )
}

const AssistDuration = observer(AssistDurationCont)

export default AssistDuration;

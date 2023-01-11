import React from 'react';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { PlayTime } from 'Player/components'

const ReduxTime = observer(({ format, name, isCustom }) => {
  const { store } = React.useContext(PlayerContext)
  const time = store.get()[name]

  return <PlayTime format={format} time={time} isCustom={isCustom} />
})

ReduxTime.displayName = "ReduxTime";

export { ReduxTime };

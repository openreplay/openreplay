import React from 'react';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { PlayTime, RealPlayTime } from 'App/player-ui'
import { useStore } from 'App/mstore'

interface IProps {
    format: string;
    name: 'time' | 'endTime';
    isCustom?: boolean;
}

const ReduxTime: React.FC<IProps> = observer(({ format, name, isCustom }) => {
  const { store } = React.useContext(PlayerContext)
  const time = store.get()[name] || 0

  return <PlayTime format={format} time={time} isCustom={isCustom} />
})

const RealReplayTimeConnected: React.FC<{startedAt: number}> = observer(({ startedAt }) => {
  const { store } = React.useContext(PlayerContext)
  const { settingsStore } = useStore()
  const tz = settingsStore.sessionSettings.timezone.value
  const time = store.get().time || 0

  return <RealPlayTime sessionStart={startedAt} time={time} tz={tz} />
})

const RealUserReplayTimeConnected: React.FC<{startedAt: number, sessionTz?: string}> = observer(({ startedAt, sessionTz }) => {
  if (!sessionTz) return null;
  const { store } = React.useContext(PlayerContext)
  const time = store.get().time || 0

  return <RealPlayTime sessionStart={startedAt} time={time} tz={sessionTz} />
})

ReduxTime.displayName = "ReduxTime";

export { ReduxTime, RealReplayTimeConnected, RealUserReplayTimeConnected };

import React from 'react';
import { useCallback } from 'react';
import cn from 'classnames';
import { Popup } from 'UI';
import { CRASHES, EVENTS } from 'Player/ios/state';
import TimeTracker from './TimeTracker';
import PlayerTime from './PlayerTime';
import cls from './timeline.module.css';

export default function Timeline({ player }) {
  const seekProgress = useCallback((e) => {
    if (player.controlsDisabled) {
      return;
    }
    const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    const time = Math.max(Math.round(p * player.state.endTime), 0);
    player.jump(time);
  });
  const scale = 100 / player.state.endTime;

  return (
    <div className="flex items-center">
      <PlayerTime player={player} timeKey="time" />
      <div className={cn(cls.progress, 'relative flex items-center')} onClick={seekProgress}>
        <TimeTracker player={player} scale={scale} />
        <div className={cn('flex items-center', cls.timeline)} />
        {player.lists[EVENTS].list.map((e) => (
          <div key={e.key} className={cls.event} style={{ left: `${e.time * scale}%` }} />
        ))}
        {player.lists[CRASHES].list.map((e) => (
          <Popup
            key={e.key}
            offset="-19"
            pinned
            className="error"
            content={
              <div className={cls.popup}>
                <b>{`Crash ${e.name}:`}</b>
                <br />
                <span>{e.reason}</span>
              </div>
            }
          >
            <div
              key={e.key}
              className={cn(cls.markup, cls.error)}
              style={{ left: `${e.time * scale}%` }}
            />
          </Popup>
        ))}
      </div>
      <PlayerTime player={player} timeKey="endTime" />
    </div>
  );
}

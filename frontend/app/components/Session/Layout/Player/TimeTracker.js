import React from 'react';
import { observer } from 'mobx-react-lite';
import cls from './timeTracker.module.css';


function TimeTracker({ player, scale }) {
  return (
    <>
  		<div
        className={ cls.positionTracker }
        style={ { left: `${ player.state.time * scale }%` } }
      />
      <div
      	className={ cls.playedTimeline }
      	style={ { width: `${ player.state.time * scale }%` } }
      />
  	</>
  );
}

export default observer(TimeTracker);

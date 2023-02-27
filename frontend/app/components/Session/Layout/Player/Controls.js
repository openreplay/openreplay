import React from 'react';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import cn from 'classnames';

import Timeline from './Timeline';
import ControlButton from './ControlButton';

import cls from './Controls.module.css';



function getPlayButtonProps(player) {
    let label;
    let icon;
    if (player.state.completed) {
      label = 'Replay';
      icon = 'redo';
    } else if (player.state.playing) {
      label = 'Pause';
      icon = 'pause';
    } else {
      label = 'Play';
      icon = 'play';
    }
    return {
      label,
      icon,
    };
  }

function Controls({
	player,
  toolbar,
}) {
	useEffect(() => {
		function onKeyDown(e) {
	    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
	      return;
	    }
	    if (e.key === 'Esc' || e.key === 'Escape') {
	      player.fullscreen.disable();
	    }
      if (player.controlsDisabled) {
        return;
      }
      if (e.key === ' ') {
        document.activeElement.blur();
        player.togglePlay();
      }
	    if (e.key === "ArrowRight") {
	      player.forthTenSeconds();
	    }
	    if (e.key === "ArrowLeft") {
	      player.backTenSeconds();
	    }
	    if (e.key === "ArrowDown") {
	      player.speedDown();
	    }
	    if (e.key === "ArrowUp") {
	      player.speedUp();
	    }
	  }
	  document.addEventListener('keydown', onKeyDown);
		return () => {
    	document.removeEventListener('keydown', onKeyDown);
		}
	}, []);

  const disabled = player.controlsDisabled;
	return (
		<div className={ cls.controls }>
      <Timeline player={ player } />
      { !player.isFullscreen &&
        <div className={ cn("flex justify-between items-center", cls.buttons) } >
          <div className="flex items-center">
            <ControlButton
              disabled={ disabled }
              onClick={ player.togglePlay }
              { ...getPlayButtonProps(player) }
            />
            <ControlButton
              onClick={ player.backTenSeconds }
              disabled={ disabled }
              label="Back"
              icon="replay-10"
            />
          </div>
          <div className="flex items-center">
            <button
              className={ cn("text-gray-darkest hover:bg-gray-lightest", cls.speedButton) }
              onClick={ player.toggleSpeed }
              data-disabled={ disabled }
            >
              <div>{ player.state.speed + 'x' }</div>
            </button>
            {/* <div className={ cls.divider } />  */}
            {/* <button */}
            {/*   className={ cn("flex items-center text-gray-darkest hover:bg-gray-lightest", cls.skipIntervalButton) } */}
            {/*   onClick={ player.toggleSkip } */}
            {/*   data-disabled={ disabled } */}
            {/* > */}
            {/* 	{ player.isSkippingInactivity && <Icon name="check" color="gray-dark" /> } */}
            {/*   { 'Skip Inactivity' } */}
            {/* </button> */}
            <div className={ cls.divider } />
            { toolbar.map(({ key, label, icon, hasErrors=false, showCount = true }) =>
            	<ControlButton
            		key={ key }
                disabled={ disabled || player.lists[key].count === 0 }
                onClick={ () => player.togglePanel(key) }
                active={ player.toolPanel.key === key }
                label={ label }
                icon={ icon }
                count={ showCount && player.lists[key].countNow }
                hasErrors={ hasErrors }
              />
            )}

            <ControlButton
              disabled={ disabled }
              onClick={ player.toggleFullscreen }
              active={ player.fullscreen.enabled }
              label="Full Screen"
              icon="fullscreen"
            />
          </div>
        </div>
      }
    </div>
  );
}

export default observer(Controls);

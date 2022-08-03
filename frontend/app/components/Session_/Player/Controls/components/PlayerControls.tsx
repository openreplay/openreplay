import React from 'react'
import { Tooltip } from 'react-tippy';
import { ReduxTime } from '../Time';
import { Icon } from 'UI';
import cn from 'classnames';
// @ts-ignore
import styles from '../controls.module.css'

interface Props {
  live: boolean;
  skip: boolean;
  speed: number;
  disabled: boolean;
  playButton: JSX.Element;
  backTenSeconds: () => void;
  forthTenSeconds: () => void;
  toggleSpeed: () => void;
  toggleSkip: () => void;
  controlIcon: (icon: string, size: number, action: () => void, isBackwards: boolean, additionalClasses: string) => JSX.Element;
}

function PlayerControls(props: Props) {
  const { 
    live, 
    skip, 
    speed, 
    disabled, 
    playButton, 
    backTenSeconds, 
    forthTenSeconds, 
    toggleSpeed, 
    toggleSkip, 
    controlIcon 
  } = props;
  return (
    <div className="flex items-center">
      {playButton}
      {!live && (
        <div className="flex items-center font-semibold text-center" style={{ minWidth: 85 }}>
          {/* @ts-ignore */}
          <ReduxTime isCustom name="time" format="mm:ss" />
          <span className="px-1">/</span>
          {/* @ts-ignore */}
          <ReduxTime isCustom name="endTime" format="mm:ss" />
        </div>
      )}

      <div className="rounded ml-4 bg-active-blue border border-active-blue-border flex items-stretch">
        {/* @ts-ignore */}
        <Tooltip
          title='Rewind 10s'
          delay={0}
          position="top"
        >
          {controlIcon(
            "skip-forward-fill",
            18,
            backTenSeconds,
            true,
            'hover:bg-active-blue-border color-main h-full flex items-center'
          )}
        </Tooltip>
        <div className='p-1 border-l border-r bg-active-blue-border border-active-blue-border'>10s</div>
        {/* @ts-ignore */}
        <Tooltip
          title='Forward 10s'
          delay={0}
          position="top"
        >
          {controlIcon(
            "skip-forward-fill",
            18,
            forthTenSeconds,
            false,
            'hover:bg-active-blue-border color-main h-full flex items-center'
          )}
        </Tooltip>
      </div>

      {!live &&
        <div className='flex items-center mx-4'>
          {/* @ts-ignore */}
          <Tooltip
            title='Playback speed'
            delay={0}
            position="top"
          >
            <button
              className={styles.speedButton}
              onClick={toggleSpeed}
              data-disabled={disabled}
            >
              <div>{speed + 'x'}</div>
            </button>
          </Tooltip>

          <button
            className={cn(styles.skipIntervalButton, { [styles.withCheckIcon]: skip, [styles.active]: skip }, 'ml-4')}
            onClick={toggleSkip}
            data-disabled={disabled}
          >
            {skip && <Icon name="check" size="24" className="mr-1" />}
            {'Skip Inactivity'}
          </button>
        </div>
      }
    </div>
  )
}

export default PlayerControls;

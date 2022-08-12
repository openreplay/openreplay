import React from 'react';
import { Tooltip } from 'react-tippy';
import { ReduxTime } from '../Time';
import { Icon } from 'UI';
import cn from 'classnames';
// @ts-ignore
import styles from '../controls.module.css';

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
  controlIcon: (
    icon: string,
    size: number,
    action: () => void,
    isBackwards: boolean,
    additionalClasses: string
  ) => JSX.Element;
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
    controlIcon,
  } = props;

  const speedRef = React.useRef(null);
  const arrowBackRef = React.useRef(null);
  const arrowForwardRef = React.useRef(null);

  React.useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        arrowForwardRef.current.focus();
      }
      if (e.key === 'ArrowLeft') {
        arrowBackRef.current.focus();
      }
      if (e.key === 'ArrowDown') {
        speedRef.current.focus();
      }
      if (e.key === 'ArrowUp') {
        speedRef.current.focus();
      }
    };
    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [speedRef, arrowBackRef, arrowForwardRef]);
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
        <Tooltip title="Rewind 10s" delay={0} position="top">
          <button ref={arrowBackRef} className="h-full focus:border focus:border-blue">
            {controlIcon(
              'skip-forward-fill',
              18,
              backTenSeconds,
              true,
              'hover:bg-active-blue-border color-main h-full flex items-center'
            )}
          </button>
        </Tooltip>
        <div className="p-1 border-l border-r bg-active-blue-border border-active-blue-border">
          10s
        </div>
        {/* @ts-ignore */}
        <Tooltip title="Forward 10s" delay={0} position="top">
          <button ref={arrowForwardRef} className="h-full focus:border focus:border-blue">
            {controlIcon(
              'skip-forward-fill',
              18,
              forthTenSeconds,
              false,
              'hover:bg-active-blue-border color-main h-full flex items-center'
            )}
          </button>
        </Tooltip>
      </div>

      {!live && (
        <div className="flex items-center mx-4">
          {/* @ts-ignore */}
          <Tooltip title="Control play back speed (↑↓)" delay={0} position="top">
            <button
              ref={speedRef}
              className={cn(styles.speedButton, 'focus:border focus:border-blue')}
              onClick={toggleSpeed}
              data-disabled={disabled}
            >
              <div>{speed + 'x'}</div>
            </button>
          </Tooltip>

          <button
            className={cn(
              styles.skipIntervalButton,
              { [styles.withCheckIcon]: skip, [styles.active]: skip },
              'ml-4'
            )}
            onClick={toggleSkip}
            data-disabled={disabled}
          >
            {skip && <Icon name="check" size="24" className="mr-1" />}
            {'Skip Inactivity'}
          </button>
        </div>
      )}
    </div>
  );
}

export default PlayerControls;

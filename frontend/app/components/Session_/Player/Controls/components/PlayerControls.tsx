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
  skipIntervals: Record<number, number>;
  currentInterval: number;
  setSkipInterval: (interval: number) => void;
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
    skipIntervals,
    setSkipInterval,
    currentInterval,
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
          <button
            ref={arrowBackRef}
            className="h-full hover:border-active-blue-border focus:border focus:border-blue border-borderColor-transparent"
          >
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
          <Tooltip
            interactive
            // @ts-ignore
            theme="nopadding"
            animation="none"
            hideDelay={200}
            duration={0}
            className="cursor-pointer"
            distance={20}
            html={
              <div className="flex flex-col bg-white border border-borderColor-gray-light-shade text-figmaColors-text-primary rounded">
                <div className="font-semibold py-2 px-4 w-full text-left">
                  Jump <span className="text-disabled-text">(Secs)</span>
                </div>
                {Object.keys(skipIntervals).map((interval) => (
                  <div
                    onClick={() => setSkipInterval(parseInt(interval, 10))}
                    className="py-2 px-4 cursor-pointer hover:bg-active-blue border-t w-full text-left border-borderColor-gray-light-shade font-semibold"
                  >
                    {interval}
                    <span className="text-disabled-text">s</span>
                  </div>
                ))}
              </div>
            }
          >
            {currentInterval}s
          </Tooltip>
        </div>
        {/* @ts-ignore */}
        <Tooltip title="Forward 10s" delay={0} position="top">
          <button
            ref={arrowForwardRef}
            className="h-full hover:border-active-blue-border focus:border focus:border-blue  border-borderColor-transparent"
          >
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
        <div className="flex items-center ml-4">
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

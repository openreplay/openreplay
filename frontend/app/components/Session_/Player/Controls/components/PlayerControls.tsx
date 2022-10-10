import React from 'react';
import { Tooltip } from 'react-tippy';
import { Icon } from 'UI';
import cn from 'classnames';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import { ReduxTime } from '../Time';
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
  const [showTooltip, setShowTooltip] = React.useState(false);
  const speedRef = React.useRef(null);
  const arrowBackRef = React.useRef(null);
  const arrowForwardRef = React.useRef(null);

  React.useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
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

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };
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
            open={showTooltip}
            interactive
            // @ts-ignore
            theme="nopadding"
            animation="none"
            duration={0}
            className="cursor-pointer select-none"
            distance={20}
            html={
              <OutsideClickDetectingDiv
                onClickOutside={() => (showTooltip ? toggleTooltip() : null)}
              >
                <div className="flex flex-col bg-white border border-borderColor-gray-light-shade text-figmaColors-text-primary rounded">
                  <div className="font-semibold py-2 px-4 w-full text-left">
                    Jump <span className="text-disabled-text">(Secs)</span>
                  </div>
                  {Object.keys(skipIntervals).map((interval) => (
                    <div
                      key={interval}
                      onClick={() => {
                        toggleTooltip();
                        setSkipInterval(parseInt(interval, 10));
                      }}
                      className={cn(
                        'py-2 px-4 cursor-pointer w-full text-left font-semibold',
                        'hover:bg-active-blue border-t  border-borderColor-gray-light-shade'
                      )}
                    >
                      {interval}
                      <span className="text-disabled-text">s</span>
                    </div>
                  ))}
                </div>
              </OutsideClickDetectingDiv>
            }
          >
            <div onClick={toggleTooltip}>
              {/* @ts-ignore */}
              <Tooltip disabled={showTooltip} title="Set default skip duration">
                {currentInterval}s
              </Tooltip>
            </div>
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
        <div className="flex items-center">
          <div className="mx-2" />
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
          <div className="mx-2" />
          <button
            className={cn(
              styles.skipIntervalButton,
              { [styles.withCheckIcon]: skip, [styles.active]: skip },
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

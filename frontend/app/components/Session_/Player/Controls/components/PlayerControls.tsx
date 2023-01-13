import React from 'react';
import { Icon, Tooltip, Popover } from 'UI';
import cn from 'classnames';
import { ReduxTime } from '../Time';
// @ts-ignore
import styles from '../controls.module.css';

interface Props {
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
  const speedRef = React.useRef<HTMLButtonElement>(null);
  const arrowBackRef = React.useRef<HTMLButtonElement>(null);
  const arrowForwardRef = React.useRef<HTMLButtonElement>(null);
  const skipRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight') {
        arrowForwardRef.current?.focus();
      }
      if (e.key === 'ArrowLeft') {
        arrowBackRef.current?.focus();
      }
      if (e.key === 'ArrowDown') {
        speedRef.current?.focus();
      }
      if (e.key === 'ArrowUp') {
        speedRef.current?.focus();
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
      <div className="mx-1" />

      <div className="flex items-center font-semibold text-center" style={{ minWidth: 85 }}>
        {/* @ts-ignore */}
        <ReduxTime isCustom name="time" format="mm:ss" />
        <span className="px-1">/</span>
        {/* @ts-ignore */}
        <ReduxTime isCustom name="endTime" format="mm:ss" />
      </div>


      <div className="rounded ml-4 bg-active-blue border border-active-blue-border flex items-stretch">
        {/* @ts-ignore */}
        <Tooltip
          anchorClassName="h-full hover:border-active-blue-border hover:bg-active-blue-border focus:border focus:border-blue border-borderColor-transparent"
          title={`Rewind ${currentInterval}s`}
          placement="top"
        >
          <button
            ref={arrowBackRef}
            className="h-full  bg-transparent"
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

        <div className="p-1 border-l border-r bg-active-blue-border border-active-blue-border flex items-center">
          <Popover
            // @ts-ignore
            theme="nopadding"
            animation="none"
            duration={0}
            className="cursor-pointer select-none"
            distance={20}
            render={({ close }: any) => (
              <div className="flex flex-col bg-white border border-borderColor-gray-light-shade text-figmaColors-text-primary rounded">
                <div className="font-semibold py-2 px-4 w-full text-left">
                  Jump <span className="text-disabled-text">(Secs)</span>
                </div>
                {Object.keys(skipIntervals).map((interval) => (
                  <div
                    key={interval}
                    onClick={() => {
                      close();
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
            )}
          >
            <div onClick={toggleTooltip} ref={skipRef} className="cursor-pointer select-none">
              <Tooltip disabled={showTooltip} title="Set default skip duration">
                {/* @ts-ignore */}
                {currentInterval}s
              </Tooltip>
            </div>
          </Popover>
        </div>

        <Tooltip
          anchorClassName="h-full hover:border-active-blue-border hover:bg-active-blue-border focus:border focus:border-blue  border-borderColor-transparent"
          title={`Rewind ${currentInterval}s`}
          placement="top"
        >
          <button
            ref={arrowForwardRef}
            className="h-full bg-transparent"
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


        <div className="flex items-center">
          <div className="mx-2" />
          {/* @ts-ignore */}
          <Tooltip title="Control play back speed (↑↓)" placement="top">
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
            className={cn(styles.skipIntervalButton, {
              [styles.withCheckIcon]: skip,
              [styles.active]: skip,
            })}
            onClick={toggleSkip}
            data-disabled={disabled}
          >
            {skip && <Icon name="check" size="24" className="mr-1" />}
            {'Skip Inactivity'}
          </button>
        </div>

    </div>
  );
}

export default PlayerControls;

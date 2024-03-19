import React from 'react'
import { SkipButton } from 'App/player-ui';
import {
  PlaybackSpeedShortcut,
  SkipForwardShortcut,
  SkipBackwardShortcut,
} from 'Components/Session_/Player/Controls/components/KeyboardHelp';
import { SPEED_OPTIONS } from 'Player/player/Player';
import { Popover as AntPopover, Button } from 'antd'
import { Popover } from 'UI'
import cn from 'classnames'

export function JumpBack({
  currentInterval,
  backTenSeconds,
}: {
  currentInterval: number;
  backTenSeconds: () => void;
}) {
  return (
    <AntPopover
      content={
        <div className={'flex gap-2 items-center'}>
          <SkipBackwardShortcut />
          <div>{`Rewind ${currentInterval}s`}</div>
        </div>
      }
      placement="top"
    >
      <button
        style={{ height: 24, background: 'transparent', border: 0 }}
        className={'hover:shadow-border-main hover:text-main rounded-l '}
      >
        <SkipButton
          size={16}
          onClick={backTenSeconds}
          isBackwards={true}
          customClasses={'h-full flex items-center'}
        />
      </button>
    </AntPopover>
  );
}

export function IntervalSelector({
  skipIntervals,
  setSkipInterval,
  toggleTooltip,
  currentInterval,
}: {
  skipIntervals: Record<number, number>;
  setSkipInterval: (interval: number) => void;
  toggleTooltip: () => void;
  currentInterval: number;
}) {
  return (
    <div
      style={{ height: 24 }}
      className="border-l border-r flex items-center justify-center px-1 hover:shadow-border-main hover:text-main"
    >
      <Popover
        // @ts-ignore
        theme="nopadding"
        animation="none"
        duration={0}
        className="cursor-pointer select-none"
        distance={20}
        render={({ close }: any) => (
          <div
            className={cn(
              'flex flex-col bg-white border',
              'border-borderColor-gray-light-shade text-figmaColors-text-primary rounded'
            )}
          >
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
                  'hover:text-main hover:shadow-border-main border-t',
                  'border-borderColor-gray-light-shade'
                )}
              >
                {interval}
                <span className="text-disabled-text">s</span>
              </div>
            ))}
          </div>
        )}
      >
        <div onClick={toggleTooltip} className="cursor-pointer select-none font-semibold">
          <AntPopover content={<div>Set default skip duration</div>}>{currentInterval}s</AntPopover>
        </div>
      </Popover>
    </div>
  );
}

export function JumpForward({
  currentInterval,
  forthTenSeconds,
}: {
  currentInterval: number;
  forthTenSeconds: () => void;
}) {
  return (
    <AntPopover
      content={
        <div className={'flex gap-2 items-center'}>
          <SkipForwardShortcut />
          <div>{`Forward ${currentInterval}s`}</div>
        </div>
      }
      placement="top"
    >
      <button
        style={{ height: 24, background: 'transparent', border: 0 }}
        className={'hover:text-main hover:shadow-border-main rounded-r '}
      >
        <SkipButton
          size={16}
          onClick={forthTenSeconds}
          customClasses={'h-full flex items-center'}
        />
      </button>
    </AntPopover>
  );
}

export function SpeedOptions({
  toggleSpeed,
  disabled,
  toggleTooltip,
  speed,
}: {
  toggleSpeed: (i: number) => void;
  disabled: boolean;
  toggleTooltip: () => void;
  speed: number;
}) {
  return (
    <Popover
      // @ts-ignore
      theme="nopadding"
      animation="none"
      duration={0}
      className="cursor-pointer select-none"
      distance={20}
      render={({ close }: any) => (
        <div className="flex flex-col bg-white border border-borderColor-gray-light-shade text-figmaColors-text-primary rounded">
          <div className="font-semibold py-2 px-4 w-full text-left">Playback speed</div>
          {Object.keys(SPEED_OPTIONS).map((index: any) => (
            <div
              key={SPEED_OPTIONS[index]}
              onClick={() => {
                close();
                toggleSpeed(index);
              }}
              className={cn(
                'py-2 px-4 cursor-pointer w-full text-left font-semibold',
                'hover:bg-active-blue border-t  border-borderColor-gray-light-shade'
              )}
            >
              {SPEED_OPTIONS[index]}
              <span className="text-disabled-text">x</span>
            </div>
          ))}
        </div>
      )}
    >
      <div onClick={toggleTooltip} className="cursor-pointer select-none">
        <AntPopover
          content={
            <div className={'flex gap-2 items-center'}>
              <PlaybackSpeedShortcut />
              <div>Change playback speed</div>
            </div>
          }
        >
          <Button disabled={disabled} size={'small'} className={'font-semibold'}>
            {speed + 'x'}
          </Button>
        </AntPopover>
      </div>
    </Popover>
  );
}

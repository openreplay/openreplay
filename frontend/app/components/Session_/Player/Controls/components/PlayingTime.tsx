import {ITimeMode, TimeMode} from "Components/Session_/Player/Controls/components/PlayerControls";
import React from 'react'
import { Popover } from 'UI'
import { RealReplayTimeConnected, ReduxTime, RealUserReplayTimeConnected } from "Components/Session_/Player/Controls/Time";

interface Props {
  timeMode: ITimeMode;
  startedAt: number;
  setTimeMode: (mode: ITimeMode) => void;
  sessionTz?: string;
}

function PlayingTime({ timeMode, setTimeMode, startedAt, sessionTz }: Props) {
  return (
    <Popover
      // @ts-ignore
      theme="nopadding"
      animation="none"
      duration={0}
      className="cursor-pointer select-none"
      distance={20}
      render={({ close }) => (
        <div className={'flex flex-col gap-2 bg-white py-2 rounded color-gray-darkest text-left'}>
          <div className={'font-semibold px-4 cursor-default'}>Playback Time Mode</div>
          <div className={'flex flex-col cursor-pointer hover:bg-active-blue w-full px-4'}>
            <div className={'text-sm text-disabled-text text-left'}>Current / Session Duration</div>
            <div
              className={'flex items-center text-left'}
              onClick={() => {
                setTimeMode(TimeMode.Timestamp);
                close();
              }}
            >
              <ReduxTime isCustom name="time" format="mm:ss" />
              <span className="px-1">/</span>
              <ReduxTime isCustom name="endTime" format="mm:ss" />
            </div>
          </div>
          {sessionTz ?
            <div
              className={'flex flex-col cursor-pointer hover:bg-active-blue w-full px-4'}
              onClick={() => {
                setTimeMode(TimeMode.UserReal);
                close();
              }}
            >
              <div className={'text-sm text-disabled-text text-left'}>User's time</div>
              <div className={'text-left'}>
                <RealUserReplayTimeConnected startedAt={startedAt} sessionTz={sessionTz}/>
              </div>
            </div>
          : null}
          <div
            className={'flex flex-col cursor-pointer hover:bg-active-blue w-full px-4'}
            onClick={() => {
              setTimeMode(TimeMode.Real);
              close();
            }}
          >
            <div className={'text-sm text-disabled-text text-left'}>Based on your settings</div>
            <div className={'text-left'}>
              <RealReplayTimeConnected startedAt={startedAt} />
            </div>
          </div>
        </div>
      )}
    >
      <div className="flex items-center font-semibold text-center" style={{ minWidth: 85 }}>
        {timeMode === TimeMode.Real ? (
          <RealReplayTimeConnected startedAt={startedAt} />
        ) : timeMode === TimeMode.UserReal ? (
          <RealUserReplayTimeConnected startedAt={startedAt} sessionTz={sessionTz} />
        ) : (
          <>
            <ReduxTime isCustom name="time" format="mm:ss" />
            <span className="px-1">/</span>
            <ReduxTime isCustom name="endTime" format="mm:ss" />
          </>
        )}
      </div>
    </Popover>
  );
}

export default PlayingTime

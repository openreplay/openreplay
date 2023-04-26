import React from 'react'
import { Popover } from 'UI'
import { RealReplayTimeConnected, ReduxTime } from "Components/Session_/Player/Controls/Time";

interface Props {
  isUniTime: boolean;
  startedAt: number;
  setIsUniTime: (isUniTime: boolean) => void;
}

function PlayingTime({ isUniTime, setIsUniTime, startedAt }: Props) {
  return (
    <Popover
      // @ts-ignore
      theme="nopadding"
      animation="none"
      duration={0}
      className="cursor-pointer select-none"
      distance={20}
      render={({close}) => (
        <div className={'flex flex-col gap-2 bg-white py-2 rounded'}>
          <div className={'font-semibold px-4'}>Playback Time Mode</div>
          <div className={'flex flex-col cursor-pointer hover:bg-active-blue w-full px-4'}>
            <div className={'text-sm text-disabled-text'}>Current / Session Duration</div>
            <div className={'flex items-center font-semibold text-center'} onClick={() => {
              setIsUniTime(false);
              close();
            }}>
              <ReduxTime isCustom name="time" format="mm:ss" />
              <span className="px-1">/</span>
              <ReduxTime isCustom name="endTime" format="mm:ss" />
            </div>
          </div>
          <div className={'flex flex-col cursor-pointer hover:bg-active-blue w-full px-4'} onClick={() => {
            setIsUniTime(true);
            close();
          }}>
            <div className={'text-sm text-disabled-text'}>Based on your settings</div>
            <div className={'font-semibold'}><RealReplayTimeConnected startedAt={startedAt} /></div>
          </div>
        </div>
      )}
    >
      <div className="flex items-center font-semibold text-center" style={{ minWidth: 85 }}>
        {isUniTime ? (
          <RealReplayTimeConnected startedAt={startedAt} />
        ) : (
          <>
            <ReduxTime isCustom name="time" format="mm:ss" />
            <span className="px-1">/</span>
            <ReduxTime isCustom name="endTime" format="mm:ss" />
          </>
        )}
      </div>
    </Popover>
  )
}

export default PlayingTime

import {
  CaretDownOutlined,
  ControlOutlined,
  MutedOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { Button, InputNumber, Popover } from 'antd';
import { Slider } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';

function DropdownAudioPlayer({
  audioEvents,
}: {
  audioEvents: { payload: Record<any, any>; timestamp: number }[];
}) {
  const { store } = useContext(PlayerContext);
  const [isVisible, setIsVisible] = useState(false);
  const [volume, setVolume] = useState(35);
  const [delta, setDelta] = useState(0);
  const [deltaInputValue, setDeltaInputValue] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const lastPlayerTime = useRef(0);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const { time = 0, speed = 1, playing, sessionStart } = store?.get() ?? {};

  const files = audioEvents.map((pa) => {
    const data = pa.payload;
    return {
      url: data.url,
      timestamp: data.timestamp,
      start: pa.timestamp - sessionStart,
    };
  });

  const toggleMute = () => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.muted = !audio.muted;
      }
    });
    setIsMuted(!isMuted);
    if (!isMuted) {
      onVolumeChange(0);
    } else {
      onVolumeChange(35);
    }
  };

  const toggleVisible = () => {
    setIsVisible(!isVisible);
  };

  const handleDelta = (value: any) => {
    setDeltaInputValue(parseFloat(value));
  };

  const onSync = () => {
    setDelta(deltaInputValue);
    handleSeek(time + deltaInputValue * 1000);
  };

  const onCancel = () => {
    setDeltaInputValue(0);
    setIsVisible(false);
  };

  const onReset = () => {
    setDelta(0);
    setDeltaInputValue(0);
    handleSeek(time);
  };

  const onVolumeChange = (value: number) => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.volume = value / 100;
      }
    });
    setVolume(value);
    setIsMuted(value === 0);
  };

  const handleSeek = (timeMs: number) => {
    Object.entries(audioRefs.current).forEach(([key, audio]) => {
      if (audio) {
        const file = files.find((f) => f.url === key);
        if (file) {
          audio.currentTime = Math.max(
            (timeMs + delta * 1000 - file.start) / 1000,
            0
          );
        }
      }
    });
  };

  const changePlaybackSpeed = (speed: number) => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.playbackRate = speed;
      }
    });
  };

  useEffect(() => {
    const deltaMs = delta * 1000;
    if (Math.abs(lastPlayerTime.current - time - deltaMs) >= 250) {
      handleSeek(time);
    }
    Object.entries(audioRefs.current).forEach(([url, audio]) => {
      if (audio) {
        const file = files.find((f) => f.url === url);
        if (file && time >= file.start) {
          if (audio.paused && playing) {
            audio.play();
          }
        } else {
          audio.pause();
        }
        if (audio.muted !== isMuted) {
          audio.muted = isMuted;
        }
      }
    });
    lastPlayerTime.current = time + deltaMs;
  }, [time, delta]);

  useEffect(() => {
    changePlaybackSpeed(speed);
  }, [speed]);

  useEffect(() => {
    Object.entries(audioRefs.current).forEach(([url, audio]) => {
      if (audio) {
        const file = files.find((f) => f.url === url);
        if (file && playing && time >= file.start) {
          audio.play();
        } else {
          audio.pause();
        }
      }
    });
    setVolume(isMuted ? 0 : volume);
  }, [playing]);

  return (
    <div className={'relative'}>
      <div className={'flex items-center'} style={{ height: 24 }}>
        <Popover
          trigger={'click'}
          className={'h-full'}
          content={
            <div
              className={'flex flex-col gap-2 rounded'}
              style={{ height: 200 }}
            >
              <Slider vertical value={volume} onChange={onVolumeChange} />
              <Button
                className={'flex items-center justify-center py-4 px-4'}
                onClick={toggleMute}
                shape={'circle'}
              >
                {isMuted ? <MutedOutlined /> : <SoundOutlined />}
              </Button>
            </div>
          }
        >
          <div
            className={
              'px-2 h-full cursor-pointer border rounded-l border-gray-light  hover:border-main hover:text-main hover:z-10'
            }
          >
            {isMuted ? <MutedOutlined /> : <SoundOutlined />}
          </div>
        </Popover>
        <div
          onClick={toggleVisible}
          style={{ marginLeft: -1 }}
          className={
            'px-2 h-full border rounded-r border-gray-light cursor-pointer hover:border-main hover:text-main hover:z-10'
          }
        >
          <CaretDownOutlined />
        </div>
      </div>

      {isVisible ? (
        <div
          className={
            'absolute left-1/2 top-0 border shadow border-gray-light rounded bg-white p-4 flex flex-col gap-4 mb-4'
          }
          style={{
            width: 240,
            transform: 'translate(-75%, -110%)',
            zIndex: 101,
          }}
        >
          <div className={'font-semibold flex items-center gap-2'}>
            <ControlOutlined />
            <div>Audio Track Synchronization</div>
          </div>
          <InputNumber
            style={{ width: 180 }}
            value={deltaInputValue}
            size={'small'}
            step={'0.250'}
            name={'audio delta'}
            formatter={(value) => `${value}s`}
            parser={(value) => value?.replace('s', '') as unknown as number}
            stringMode
            onChange={handleDelta}
          />
          <div className={'w-full flex items-center gap-2'}>
            <Button size={'small'} type={'primary'} onClick={onSync}>
              Sync
            </Button>
            <Button size={'small'} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size={'small'}
              type={'text'}
              className={'ml-auto'}
              onClick={onReset}
            >
              Reset
            </Button>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'none' }}>
        {files.map((file) => (
          <audio
            key={file.url}
            ref={(el) => (audioRefs.current[file.url] = el)}
            controls
            muted={isMuted}
            className="w-full"
            style={{ height: 32 }}
          >
            <source src={file.url} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        ))}
      </div>
    </div>
  );
}

export default observer(DropdownAudioPlayer);

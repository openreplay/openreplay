import { MutedOutlined, SoundOutlined, CaretDownOutlined, ControlOutlined } from '@ant-design/icons';
import { Button, Popover, InputNumber } from 'antd';
import { Slider } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';

import { PlayerContext } from '../../playerContext';

function DropdownAudioPlayer({ url }: { url: string }) {
  const { store } = React.useContext(PlayerContext);
  const [isVisible, setIsVisible] = useState(false);
  const [volume, setVolume] = useState(0);
  const [delta, setDelta] = useState(0);
  const [deltaInputValue, setDeltaInputValue] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const lastPlayerTime = React.useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { time = 0, speed = 1, playing } = store?.get() ?? {};

  const toggleMute = () => {
    if (audioRef.current) {
      if (audioRef.current?.paused && playing) {
        audioRef.current?.play();
      }
      audioRef.current.muted = !audioRef.current.muted;
      if (isMuted) {
        onVolumeChange(35)
      } else {
        onVolumeChange(0)
      }
    }
  };

  const toggleVisible = () => {
    setIsVisible(!isVisible);
  };

  const handleDelta = (value: any) => {
    setDeltaInputValue(parseFloat(value))
  }

  const onSync = () => {
    setDelta(deltaInputValue)
    handleSeek(time + deltaInputValue * 1000)
  }

  const onCancel = () => {
    setDeltaInputValue(0)
    setIsVisible(false)
  }

  const onReset = () => {
    setDelta(0)
    setDeltaInputValue(0)
    handleSeek(time)
  }

  const onVolumeChange = (value: number) => {
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
    if (value === 0) {
      setIsMuted(true);
    }
    if (value > 0) {
      setIsMuted(false);
    }
    setVolume(value);
  };

  const handleSeek = (timeMs: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = (timeMs + delta * 1000) / 1000;
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  React.useEffect(() => {
    const deltaMs = delta * 1000;
    if (Math.abs(lastPlayerTime.current - time - deltaMs) >= 250) {
      handleSeek(time);
    }
    if (audioRef.current) {
      if (audioRef.current.paused && playing) {
        audioRef.current?.play();
      }
      if (audioRef.current.muted !== isMuted) {
        audioRef.current.muted = isMuted;
      }
    }
    lastPlayerTime.current = time + deltaMs;
  }, [time, delta]);

  React.useEffect(() => {
    changePlaybackSpeed(speed);
  }, [speed]);

  React.useEffect(() => {
    if (playing) {
      audioRef.current?.play();
    } else {
      audioRef.current?.pause();
    }
    const volume = audioRef.current?.volume ?? 0
    const shouldBeMuted = audioRef.current?.muted ?? isMuted
    setVolume(shouldBeMuted ? 0 : volume * 100);
  }, [playing]);

  return (
    <div className={'relative'}>
      <div
        className={'flex items-center'}
        style={{ height: 24 }}
      >
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
          <div className={'px-2 h-full cursor-pointer border rounded-l border-gray-light  hover:border-main hover:text-main hover:z-10'}>
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
        <div className={"absolute left-1/2 top-0 border shadow border-gray-light rounded bg-white p-4 flex flex-col gap-4 mb-4"}
            style={{ width: 240, transform: 'translate(-75%, -110%)', zIndex: 101 }}>
        <div className={"font-semibold flex items-center gap-2"}>
          <ControlOutlined />
          <div>Audio Track Synchronization</div>
        </div>
        <InputNumber
          style={{ width: 180 }}
          value={deltaInputValue}
          size={"small"}
          step={"0.250"}
          name={"audio delta"}
          formatter={(value) => `${value}s`}
          parser={(value) => value?.replace('s', '') as unknown as number}
          stringMode
          onChange={handleDelta} />
        <div className={"w-full flex items-center gap-2"}>
          <Button size={"small"} type={"primary"} onClick={onSync}>Sync</Button>
          <Button size={"small"} onClick={onCancel}>Cancel</Button>

          <Button size={"small"} type={"text"} className={"ml-auto"} onClick={onReset}>Reset</Button>
        </div>
      </div>
      ) : null}

      <div
        style={{
          display: 'none',
        }}
      >
        <audio
          ref={audioRef}
          controls
          muted={isMuted}
          className="w-full"
          style={{ height: 32 }}
        >
          <source src={url} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
}

export default observer(DropdownAudioPlayer);

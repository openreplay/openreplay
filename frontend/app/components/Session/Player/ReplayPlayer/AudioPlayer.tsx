import {
  CaretDownOutlined,
  ControlOutlined,
  MutedOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { Button, InputNumber, Popover, Slider } from 'antd';
import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useTranslation } from 'react-i18next';
import { canAutoplay } from './utils';

function DropdownAudioPlayer({
  audioEvents,
}: {
  audioEvents: {
    payload: { url: string; timestamp: number };
    timestamp: number;
  }[];
}) {
  const [hasInteractionError, setHasInteractionError] = useState(false);
  const { t } = useTranslation();
  const { store, player } = useContext(PlayerContext);
  const [isVisible, setIsVisible] = useState(false);
  const [volume, setVolume] = useState(35);
  const [delta, setDelta] = useState(0);
  const [deltaInputValue, setDeltaInputValue] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const lastPlayerTime = useRef(0);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const fileLengths = useRef<Record<string, number>>({});
  const { time = 0, speed = 1, playing, sessionStart } = store?.get() ?? {};

  const files = React.useMemo(
    () =>
      audioEvents.map((pa) => {
        const data = pa.payload;
        const nativeTs = data.timestamp;
        let startTs = 0;
        if (nativeTs) {
          // our sessions are below 2 hrs, so we can assume this is a unix timestamp if its like 10 hrs long
          const isUnixTs = nativeTs > (10 * 60 * 60 * 1000);
          startTs = isUnixTs ? nativeTs - sessionStart : nativeTs;
        } else {
          startTs = pa.timestamp - sessionStart;
        }

        if (startTs < 0) {
          const delta = Math.abs(startTs / 1000);
          startTs = 0;
          setDelta(delta);
          setDeltaInputValue(delta);
          console.log(
            'Audio file start time is before session start, adding delta:',
            delta,
            'seconds'
          );
        }
        return {
          url: data.url,
          timestamp: data.timestamp,
          start: startTs,
        };
      }),
    [audioEvents.length, sessionStart],
  );

  React.useEffect(() => {
    canAutoplay().then((canPlay) => {
      if (!canPlay) {
        setHasInteractionError(true);
      }
    });
    Object.entries(audioRefs.current).forEach(([url, audio]) => {
      if (audio) {
        audio.loop = false;
        audio.addEventListener('loadedmetadata', () => {
          fileLengths.current[url] = audio.duration;
        });
      }
    });
  }, [audioRefs.current]);

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
          const targetTime = (timeMs + delta * 1000 - file.start) / 1000;
          const fileLength = fileLengths.current[key];
          if (targetTime < 0 || (fileLength && targetTime > fileLength)) {
            audio.pause();
            audio.currentTime = 0;
          } else {
            audio.currentTime = targetTime;
          }
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
    const deltaTime = Math.abs(lastPlayerTime.current - time - deltaMs);
    if (deltaTime >= 250) {
      handleSeek(time);
    }
    Object.entries(audioRefs.current).forEach(([url, audio]) => {
      if (audio) {
        const file = files.find((f) => f.url === url);
        const fileLength = fileLengths.current[url];
        if (file) {
          if (fileLength && fileLength * 1000 + file.start < time) {
            return;
          }
          if (time >= file.start) {
            if (audio.paused && playing) {
              audio
                .play()
                .then(() => {
                  return; // all good
                })
                .catch((e) => {
                  setHasInteractionError(true);
                  console.error('Has to interact error', e);
                });
            }
          } else {
            audio.pause();
          }
        }
      }
    });
    lastPlayerTime.current = time + deltaMs;
  }, [time, delta]);

  useEffect(() => {
    if (hasInteractionError) {
      player.pause();
    }
  }, [hasInteractionError, time]);

  useEffect(() => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.muted = isMuted;
      }
    });
  }, [isMuted]);

  useEffect(() => {
    changePlaybackSpeed(speed);
  }, [speed]);

  useEffect(() => {
    Object.entries(audioRefs.current).forEach(([url, audio]) => {
      if (audio) {
        const file = files.find((f) => f.url === url);
        const fileLength = fileLengths.current[url];
        if (file) {
          if (fileLength && fileLength * 1000 + file.start < time) {
            audio.pause();
            return;
          }
          if (playing && time >= file.start) {
            audio.play();
          } else {
            audio.pause();
          }
        }
      }
    });
    setVolume(isMuted ? 0 : volume);
  }, [playing]);

  const onInteract = () => {
    if (hasInteractionError) {
      setHasInteractionError(false);
      player.play();
    }
  };

  const buttonIcon =
    'px-2 cursor-pointer border border-gray-light hover:border-main hover:text-main hover:z-10 h-fit';
  return (
    <div className="relative">
      {hasInteractionError ? (
        <div
          className="fixed h-screen w-screen bottom-0 left-0 z-50 bg-gray-lighter opacity-70 cursor-pointer"
          onClick={onInteract}
        >
          <div className="flex items-center justify-center h-full">
            <div className="text-black">{t('Click to resume replay.')}</div>
          </div>
        </div>
      ) : null}
      <div className="flex items-center" style={{ height: 24 }}>
        <Popover
          trigger="click"
          content={
            <div
              className="flex flex-col gap-2 rounded"
              style={{ height: 200 }}
            >
              <Slider vertical value={volume} onChange={onVolumeChange} />
              <Button
                className="flex items-center justify-center py-4 px-4"
                onClick={toggleMute}
                shape="circle"
              >
                {isMuted ? <MutedOutlined /> : <SoundOutlined />}
              </Button>
            </div>
          }
        >
          <div className={cn(buttonIcon, 'rounded-l')}>
            {isMuted ? <MutedOutlined /> : <SoundOutlined />}
          </div>
        </Popover>
        <div
          onClick={toggleVisible}
          style={{ marginLeft: -1 }}
          className={cn(buttonIcon, 'rounded-r')}
        >
          <CaretDownOutlined />
        </div>
      </div>

      {isVisible ? (
        <div
          className="absolute left-1/2 top-0 border shadow border-gray-light rounded bg-white p-4 flex flex-col gap-4 mb-4"
          style={{
            width: 240,
            transform: 'translate(-75%, -110%)',
            zIndex: 101,
          }}
        >
          <div className="font-semibold flex items-center gap-2">
            <ControlOutlined />
            <div>{t('Audio Track Synchronization')}</div>
          </div>
          <InputNumber
            style={{ width: 180 }}
            value={deltaInputValue}
            size="small"
            step="0.250"
            name="audio delta"
            formatter={(value) => `${value}s`}
            parser={(value) => value?.replace('s', '') as unknown as number}
            stringMode
            onChange={handleDelta}
          />
          <div className="w-full flex items-center gap-2">
            <Button size="small" type="primary" onClick={onSync}>
              {t('Sync')}
            </Button>
            <Button size="small" onClick={onCancel}>
              {t('Cancel')}
            </Button>
            <Button
              size="small"
              type="text"
              className="ml-auto"
              onClick={onReset}
            >
              {t('Reset')}
            </Button>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'none' }}>
        {files.map((file) => (
          <audio
            loop={false}
            key={file.url}
            ref={(el) => (audioRefs.current[file.url] = el)}
            controls
            preload="auto"
            muted={isMuted}
            className="w-full"
            style={{ height: 32 }}
          >
            <source src={file.url} type="audio/mpeg" />
            {t('Your browser does not support the audio element.')}
          </audio>
        ))}
      </div>
    </div>
  );
}

export default observer(DropdownAudioPlayer);

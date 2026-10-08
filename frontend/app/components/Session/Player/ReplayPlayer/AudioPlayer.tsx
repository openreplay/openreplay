import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { NumberInput } from '@/ui/inputs/number-input';
import { PopoverPanel } from '@/ui/overlays/popover';
import { AudioLines, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';

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
          const isUnixTs = nativeTs > 10 * 60 * 60 * 1000;
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
            'seconds',
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
    setVolume(isMuted ? 0 : volume);
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
  }, [playing]);

  const onInteract = () => {
    if (hasInteractionError) {
      setHasInteractionError(false);
      player.play();
    }
  };

  return (
    <div className="relative">
      {hasInteractionError ? (
        <button
          type="button"
          className="fixed bottom-0 left-0 z-50 flex h-screen w-screen items-center justify-center bg-[var(--m-scrim)]"
          onClick={onInteract}
        >
          <span className="rounded-control bg-surface-raised px-4 py-2 text-sm text-content-primary">
            {t('Click to resume replay.')}
          </span>
        </button>
      ) : null}
      <div className="flex items-center">
        <PopoverPanel
          placement="top"
          className="p-3"
          content={
            <div className="flex items-center gap-3">
              <IconButton
                icon={isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                label={isMuted ? t('Unmute') : t('Mute')}
                variant="ghost"
                onClick={toggleMute}
              />
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                aria-label={t('Volume')}
                className="w-32 accent-[var(--m-content-accent)]"
                onChange={(e) => onVolumeChange(Number(e.target.value))}
              />
            </div>
          }
        >
          <span>
            <IconButton
              icon={isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              label={t('Audio volume')}
              variant="ghost"
            />
          </span>
        </PopoverPanel>
        <IconButton
          icon={<ChevronDown size={14} />}
          label={t('Audio track synchronization')}
          variant="ghost"
          onClick={toggleVisible}
        />
      </div>

      {isVisible ? (
        <div
          className="m-elevated absolute left-1/2 top-0 flex flex-col gap-4 rounded-surface border border-border-subtle bg-surface-raised p-4"
          style={{
            width: 240,
            transform: 'translate(-75%, -110%)',
            zIndex: 101,
          }}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-content-primary">
            <AudioLines size={14} />
            {t('Audio track synchronization')}
          </div>
          <NumberInput
            value={deltaInputValue}
            step={0.25}
            aria-label={t('Audio delta in seconds')}
            suffix="s"
            onChange={(v) => handleDelta(v ?? 0)}
          />
          <div className="w-full flex items-center gap-2">
            <Button variant="primary" onClick={onSync}>
              {t('Sync')}
            </Button>
            <Button onClick={onCancel}>{t('Cancel')}</Button>
            <Button variant="subtle" className="ml-auto" onClick={onReset}>
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

import { MutedOutlined, SoundOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useRef, useState } from 'react';

import { PlayerContext } from '../../playerContext';

function DropdownAudioPlayer({ url }: { url: string }) {
  const { store } = React.useContext(PlayerContext);
  const [isVisible, setIsVisible] = useState(false);
  const [delta, setDelta] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const lastPlayerTime = React.useRef(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { time = 0, speed = 1, playing } = store?.get() ?? {};

  const toggleMute = () => {
    if (audioRef.current) {
      if (audioRef.current?.paused && playing) {
        audioRef.current?.play();
      }
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (timeMs: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = (timeMs + delta) / 1000;
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  React.useEffect(() => {
    if (Math.abs(lastPlayerTime.current - time) > 1000) {
      handleSeek(time);
    }
    lastPlayerTime.current = time;
  }, [time]);

  React.useEffect(() => {
    changePlaybackSpeed(speed);
  }, [speed]);

  React.useEffect(() => {
    if (playing) {
      audioRef.current?.play();
    } else {
      audioRef.current?.pause();
    }
  }, [playing]);

  return (
    <div className="relative mr-2">
      <Tooltip
        title={`This session contains audio recording. Press to ${
          isMuted ? 'unmute' : 'mute'
        }`}
      >
        <Button
          className={'flex items-center justify-center'}
          onClick={toggleMute}
          size={'small'}
        >
          {isMuted ? <MutedOutlined /> : <SoundOutlined />}
        </Button>
      </Tooltip>
      <div
        style={{
          display: isVisible ? 'block' : 'none',
          zIndex: 2,
          width: 420,
          marginRight: 40,
          right: 0,
          top: -6,
        }}
        className="absolute shadow p-2 shadow-lg bg-white rounded border border-gray-lighter"
      >
        <audio
          ref={audioRef}
          controls
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

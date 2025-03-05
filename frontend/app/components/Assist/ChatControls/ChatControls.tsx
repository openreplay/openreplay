import React, { useState } from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import { Button } from 'antd';
import type { LocalStream } from 'Player';
import stl from './ChatControls.module.css';

interface Props {
  stream: LocalStream | null;
  endCall: () => void;
  videoEnabled: boolean;
  isPrestart?: boolean;
  setVideoEnabled: (isEnabled: boolean) => void;
}
function ChatControls({
  stream,
  endCall,
  videoEnabled,
  setVideoEnabled,
  isPrestart,
}: Props) {
  const [audioEnabled, setAudioEnabled] = useState(true);

  const toggleAudio = () => {
    if (!stream) {
      return;
    }
    setAudioEnabled(stream.toggleAudio());
  };

  const toggleVideo = () => {
    if (!stream) {
      return;
    }
    stream.toggleVideo().then((v) => setVideoEnabled(v));
  };

  /** muting user if he is auto connected to the call */
  React.useEffect(() => {
    if (isPrestart) {
      audioEnabled && toggleAudio();
    }
  }, []);

  return (
    <div
      className={cn(
        stl.controls,
        'flex items-center w-full justify-start bottom-0 px-2',
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(stl.btnWrapper, { [stl.disabled]: audioEnabled })}>
          <Button
            size="small"
            variant="text"
            onClick={toggleAudio}
            icon={<Icon name={audioEnabled ? 'mic' : 'mic-mute'} size="16" />}
          >
            <span
              className={cn('ml-1 color-gray-medium text-sm', {
                'color-red': audioEnabled,
              })}
            >
              {audioEnabled ? 'Mute' : 'Unmute'}
            </span>
          </Button>
        </div>

        <div className={cn(stl.btnWrapper, { [stl.disabled]: videoEnabled })}>
          <Button
            size="small"
            variant="text"
            onClick={toggleVideo}
            icon={
              <Icon
                name={videoEnabled ? 'camera-video' : 'camera-video-off'}
                size="16"
              />
            }
          >
            <span
              className={cn('ml-1 color-gray-medium text-sm', {
                'color-red': videoEnabled,
              })}
            >
              {videoEnabled ? 'Stop Video' : 'Start Video'}
            </span>
          </Button>
        </div>
      </div>
      <div className="ml-auto">
        <button className={stl.endButton} onClick={endCall}>
          END
        </button>
      </div>
    </div>
  );
}

export default ChatControls;

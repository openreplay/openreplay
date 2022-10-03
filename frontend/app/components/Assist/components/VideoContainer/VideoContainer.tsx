import React, { useEffect, useRef } from 'react';
import { videoFeeds } from 'Player/MessageDistributor/managers/AssistManager';

interface Props {
  stream: MediaStream | null;
  muted?: boolean;
  height?: number | string;
  setRemoteEnabled?: (isEnabled: boolean) => void;
}

function VideoContainer({ stream, muted = false, height = 280, setRemoteEnabled }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [isEnabled, setEnabled] = React.useState(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [ref.current, stream, stream.getVideoTracks()[0]?.getSettings().width]);

  useEffect(() => {
    if (!stream) {
      return;
    }
    const iid = setInterval(() => {
      const settings = stream.getVideoTracks()[0]?.getSettings();
      const isDummyVideoTrack = settings
        ? settings.width === 2 ||
          settings.frameRate === 0 ||
          (!settings.frameRate && !settings.width)
        : true;
      const shouldBeEnabled = !isDummyVideoTrack;
      console.log(stream.getVideoTracks());
      if (isEnabled !== shouldBeEnabled) {
        setEnabled(shouldBeEnabled);
        setRemoteEnabled?.(shouldBeEnabled);
      }
    }, 500);
    return () => clearInterval(iid);
  }, [stream, isEnabled]);

  useEffect(() => {
    if (!stream) return;
    // @ts-ignore
    videoFeeds.observe((key, value) => {
      const track = stream.getVideoTracks()[0];
      if (key === track.id) {
        track.enabled = value;
        setEnabled(value);
        setRemoteEnabled?.(value);
      }
    });
  }, [stream]);

  return (
    <div
      className={'flex-1'}
      style={{
        display: isEnabled ? undefined : 'none',
        width: isEnabled ? undefined : '0px!important',
        height: isEnabled ? undefined : '0px!important',
        border: '1px solid grey',
      }}
    >
      <video autoPlay ref={ref} muted={muted} style={{ height: height }} />
    </div>
  );
}

export default VideoContainer;

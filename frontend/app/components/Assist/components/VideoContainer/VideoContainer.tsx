import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  stream: MediaStream | null;
  muted?: boolean;
  height?: number | string;
  setRemoteEnabled?: (isEnabled: boolean) => void;
  local?: boolean;
  isAgent?: boolean;
}

function VideoContainer({
  stream,
  muted = false,
  height = 280,
  setRemoteEnabled,
  local,
  isAgent,
}: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLVideoElement>(null);
  const [isEnabled, setEnabled] = React.useState(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [ref.current, stream, stream?.getVideoTracks()[0]?.getSettings().width]);

  useEffect(() => {
    if (!stream) {
      return;
    }
    const iid = setInterval(() => {
      const track = stream.getVideoTracks()[0];

      if (track) {
        if (!track.enabled) {
          setEnabled(false);
          setRemoteEnabled?.(false);
        } else {
          setEnabled(true);
          setRemoteEnabled?.(true);
        }
      } else {
        setEnabled(false);
        setRemoteEnabled?.(false);
      }
    }, 500);
    return () => clearInterval(iid);
  }, [stream]);

  return (
    <div
      className="flex-1"
      style={{
        width: isEnabled ? undefined : '0px!important',
        height: isEnabled ? undefined : '0px !important',
        border: '1px solid grey',
        transform: local ? 'scaleX(-1)' : undefined,
        display: isEnabled ? 'block' : 'none',
      }}
    >
      <video
        autoPlay
        ref={ref}
        muted={muted}
        style={{ height }}
      />
    </div>
  );
}

export default VideoContainer;

import { Button } from '@/ui/actions/button';
import type { LocalStream } from 'Player';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  stream: LocalStream | null;
  endCall: () => void;
  videoEnabled: boolean;
  isPrestart?: boolean;
  setVideoEnabled: (isEnabled: boolean) => void;
}

/** The agent's side of a call: mic, camera, hang up. */
function ChatControls({
  stream,
  endCall,
  videoEnabled,
  setVideoEnabled,
  isPrestart,
}: Props) {
  const { t } = useTranslation();
  const [audioEnabled, setAudioEnabled] = useState(true);

  const toggleAudio = () => {
    if (!stream) return;
    setAudioEnabled(stream.toggleAudio());
  };

  const toggleVideo = () => {
    if (!stream) return;
    void stream.toggleVideo().then((v) => setVideoEnabled(v));
  };

  // an auto-connected agent joins muted
  React.useEffect(() => {
    if (isPrestart && audioEnabled) toggleAudio();
  }, []);

  return (
    <div className="m-call__controls">
      <Button variant="subtle" onClick={toggleAudio}>
        {audioEnabled ? <Mic size={14} /> : <MicOff size={14} />}
        {audioEnabled ? t('Mute') : t('Unmute')}
      </Button>
      <Button variant="subtle" onClick={toggleVideo}>
        {videoEnabled ? <Video size={14} /> : <VideoOff size={14} />}
        {videoEnabled ? t('Stop video') : t('Start video')}
      </Button>
      <Button variant="danger" className="ml-auto" onClick={endCall}>
        <PhoneOff size={14} />
        {t('End')}
      </Button>
    </div>
  );
}

export default ChatControls;

import React, { useState, useEffect, useRef } from 'react'
import { Button, Icon } from 'UI'

interface Props {
  stream: MediaStream | null
  muted?: boolean
}

function VideoContainer({ stream, muted = false }: Props) {
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [ ref.current, stream ])

  const toggleAudio = () => {
    if (!stream) { return; }
    const aEn = !audioEnabled
    stream.getAudioTracks().forEach(track => track.enabled = aEn);
    setAudioEnabled(aEn);
  }
  
  const toggleVideo = () => {
    if (!stream) { return; }
    const vEn = !videoEnabled;
    stream.getVideoTracks().forEach(track => track.enabled = vEn);
    setVideoEnabled(vEn)
  }

  return (
    <div className="relative bg-gray-light-shade border p-1" style={{ height: '160px', width: '200px' }}>      
      <div className="absolute inset-0 flex justify-center border border-gray-300 p-1 bg-white radius bg-opacity-25">
        <video autoPlay ref={ ref } muted={ muted } />
        <div className="flex items-center absolute w-full justify-center bottom-0 bg-gray-lightest">
          <Button plain size="small" onClick={toggleAudio}>
            <Icon name={audioEnabled ? 'mic' : 'mic-mute'} size="16" />
          </Button>

          <Button plain size="small" onClick={toggleVideo}>
            <Icon name={ videoEnabled ? 'camera-video' : 'camera-video-off' } size="16" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default VideoContainer

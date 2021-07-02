import React, { useState, useEffect, useRef } from 'react'
import { Button, Icon } from 'UI'
import cn from 'classnames'
import stl from './VideoContainer.css'

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
    <div className="relative bg-gray-light-shade" style={{ height: '152px' }}>
      <div className="absolute inset-0 flex justify-center border border-gray-300 bg-white radius bg-opacity-25">
        <video autoPlay ref={ ref } muted={ muted } />
        <div className={cn(stl.controls, "flex items-center absolute w-full justify-end bottom-0")}>
          <div className={cn(stl.btnWrapper, { [stl.disabled]: !audioEnabled})}>
            <Button plain size="small" onClick={toggleAudio} noPadding>
              <Icon name={audioEnabled ? 'mic' : 'mic-mute'} size="14" />
            </Button>
          </div>

          <div className={cn(stl.btnWrapper, { [stl.disabled]: !videoEnabled})}>
            <Button plain size="small" onClick={toggleVideo} noPadding>
              <Icon name={ videoEnabled ? 'camera-video' : 'camera-video-off' } size="14" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoContainer

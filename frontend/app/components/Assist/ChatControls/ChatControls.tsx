import React, { useState } from 'react'
import stl from './ChatControls.css'
import cn from 'classnames'
import { Button, Icon } from 'UI'

interface Props {
  stream: MediaStream | null,
  endCall: () => void
}
function ChatControls({ stream, endCall } : Props) {
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)

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
    <div className={cn(stl.controls, "flex items-center w-full justify-start bottom-0 px-2")}>
      <div className="flex items-center">
        <div className={cn(stl.btnWrapper, { [stl.disabled]: !audioEnabled})}>
          <Button plain size="small" onClick={toggleAudio} noPadding className="flex items-center">
            <Icon name={audioEnabled ? 'mic' : 'mic-mute'} size="16" />
            <span className="ml-2 color-gray-medium text-sm">{audioEnabled ? 'Mute' : 'Unmute'}</span>
          </Button>
        </div>

        <div className={cn(stl.btnWrapper, { [stl.disabled]: !videoEnabled})}>
          <Button plain size="small" onClick={toggleVideo} noPadding className="flex items-center">
            <Icon name={ videoEnabled ? 'camera-video' : 'camera-video-off' } size="16" />
            <span className="ml-2 color-gray-medium text-sm">{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
          </Button>
        </div>
      </div>
      <div className="ml-auto">
        <button className={stl.endButton} onClick={endCall}>
          END
        </button>
      </div>
    </div>
  )
}

export default ChatControls

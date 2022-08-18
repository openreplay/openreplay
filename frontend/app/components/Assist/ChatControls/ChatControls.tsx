import React, { useState } from 'react'
import stl from './ChatControls.module.css'
import cn from 'classnames'
import { Button, Icon } from 'UI'
import type { LocalStream } from 'Player/MessageDistributor/managers/LocalStream';


interface Props {
  stream: LocalStream | null,
  endCall: () => void,
  videoEnabled: boolean,
  isPrestart?: boolean,
  setVideoEnabled: (isEnabled: boolean) => void
}
function ChatControls({ stream, endCall, videoEnabled, setVideoEnabled, isPrestart } : Props) {
  const [audioEnabled, setAudioEnabled] = useState(true)

  const toggleAudio = () => {
    if (!stream) { return; }
    setAudioEnabled(stream.toggleAudio());
  }
  
  const toggleVideo = () => {
    if (!stream) { return; }
    stream.toggleVideo()
    .then(setVideoEnabled)
  }

  /** muting user if he is auto connected to the call */
  React.useEffect(() => {
    if (isPrestart) {
      audioEnabled && toggleAudio();
    }
  }, [])

  return (
    <div className={cn(stl.controls, "flex items-center w-full justify-start bottom-0 px-2")}>
      <div className="flex items-center">
        <div className={cn(stl.btnWrapper, { [stl.disabled]: audioEnabled})}>
          <Button variant="text" onClick={toggleAudio} hover>
            <Icon name={audioEnabled ? 'mic' : 'mic-mute'} size="16" />
            <span className={cn("ml-1 color-gray-medium text-sm", { 'color-red' : audioEnabled })}>{audioEnabled ? 'Mute' : 'Unmute'}</span>
          </Button>
        </div>

        <div className={cn(stl.btnWrapper, { [stl.disabled]: videoEnabled})}>
          <Button variant="text" onClick={toggleVideo} hover>
            <Icon name={ videoEnabled ? 'camera-video' : 'camera-video-off' } size="16" />
            <span className={cn("ml-1 color-gray-medium text-sm", { 'color-red' : videoEnabled })}>{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
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

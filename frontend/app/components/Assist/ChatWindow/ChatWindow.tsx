import React, { useState, FC, useEffect } from 'react'
import VideoContainer from '../components/VideoContainer'
import { Icon, Popup, Button } from 'UI'
import cn from 'classnames'
import Counter from 'App/components/shared/SessionItem/Counter'
import stl from './chatWindow.css'
import ChatControls from '../ChatControls/ChatControls'
import Draggable from 'react-draggable';
import type { LocalStream } from 'Player/MessageDistributor/managers/LocalStream';


export interface Props {
  incomeStream: MediaStream | null,
  localStream: LocalStream | null,
  userId: String,
  endCall: () => void
}

const ChatWindow: FC<Props> = function ChatWindow({ userId, incomeStream, localStream, endCall }) {
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false)
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false)

  useEffect(() => {
    if (!incomeStream) { return }
    const iid = setInterval(() => {
      const settings = incomeStream.getVideoTracks()[0]?.getSettings()
      const isDummyVideoTrack = !!settings ? (settings.width === 2 || settings.frameRate === 0) : true
      const shouldBeEnabled = !isDummyVideoTrack
      if (shouldBeEnabled !== localVideoEnabled) {
        setRemoteVideoEnabled(shouldBeEnabled)
      }
    }, 1000)
    return () => clearInterval(iid)
  }, [ incomeStream, localVideoEnabled ])

  const minimize = !localVideoEnabled && !remoteVideoEnabled

  return (
    <Draggable handle=".handle" bounds="body">
      <div
        className={cn(stl.wrapper, "fixed radius bg-white shadow-xl mt-16")}
        style={{ width: '280px' }}
      >
        <div className="handle flex items-center p-2 cursor-move select-none border-b">
          <div className={stl.headerTitle}><b>Talking to </b> {userId ? userId : 'Anonymous User'}</div>
          <Counter startTime={new Date().getTime() } className="text-sm ml-auto" />
        </div>
        <div className={cn(stl.videoWrapper, {'hidden' : minimize}, 'relative')}>
          <VideoContainer stream={ incomeStream } />
          <div className="absolute bottom-0 right-0 z-50">
            <VideoContainer stream={ localStream ? localStream.stream : null } muted width={50} />
          </div>
        </div>
        <ChatControls videoEnabled={localVideoEnabled} setVideoEnabled={setLocalVideoEnabled} stream={localStream} endCall={endCall} />
      </div>
    </Draggable>
  )
}

export default ChatWindow

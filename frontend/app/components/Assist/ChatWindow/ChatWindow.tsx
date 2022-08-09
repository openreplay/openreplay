import React, { useState, useEffect } from 'react'
import VideoContainer from '../components/VideoContainer'
import cn from 'classnames'
import Counter from 'App/components/shared/SessionItem/Counter'
import stl from './chatWindow.module.css'
import ChatControls from '../ChatControls/ChatControls'
import Draggable from 'react-draggable';
import type { LocalStream } from 'Player/MessageDistributor/managers/LocalStream';

export interface Props {
  incomeStream: MediaStream[] | null,
  localStream: LocalStream | null,
  userId: string,
  isPrestart?: boolean;
  endCall: () => void
}

function ChatWindow({ userId, incomeStream, localStream, endCall, isPrestart }: Props) {
  const [localVideoEnabled, setLocalVideoEnabled] = useState(false)
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false)

  useEffect(() => {
    if (!incomeStream || incomeStream.length === 0) { return }
    const iid = setInterval(() => {
      const settings = incomeStream.map(stream => stream.getVideoTracks()[0]?.getSettings()).filter(Boolean)
      const isDummyVideoTrack = settings.length > 0 ? (settings.every(s => s.width === 2 || s.frameRate === 0 || s.frameRate === undefined)) : true
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
          <div className={stl.headerTitle}>
            <b>Talking to </b> {userId ? userId : 'Anonymous User'}
            {incomeStream && incomeStream.length > 2 ? ' (+ other agents in the call)' : ''}
          </div>
          <Counter startTime={new Date().getTime() } className="text-sm ml-auto" />
        </div>
        <div className={cn(stl.videoWrapper, {'hidden' : minimize}, 'relative')}>
          {!incomeStream && <div className={stl.noVideo}>Error obtaining incoming streams</div>}
          {incomeStream && incomeStream.map(stream => <VideoContainer stream={ stream } />)}
          <div className="absolute bottom-0 right-0 z-50">
            <VideoContainer stream={ localStream ? localStream.stream : null } muted width={50} />
          </div>
        </div>
        <ChatControls videoEnabled={localVideoEnabled} setVideoEnabled={setLocalVideoEnabled} stream={localStream} endCall={endCall} isPrestart={isPrestart} />
      </div>
    </Draggable>
  )
}

export default ChatWindow

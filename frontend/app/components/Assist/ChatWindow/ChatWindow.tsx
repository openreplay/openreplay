import React, { useState, FC } from 'react'
import VideoContainer from '../components/VideoContainer'
import { Icon, Popup, Button } from 'UI'
import cn from 'classnames'
import Counter from 'App/components/shared/SessionItem/Counter'
import stl from './chatWindow.css'
import ChatControls from '../ChatControls/ChatControls'
import Draggable from 'react-draggable';

export interface Props {
  incomeStream: MediaStream | null,
  localStream: MediaStream | null,
  userId: String,
  endCall: () => void
}

const ChatWindow: FC<Props> = function ChatWindow({ userId, incomeStream, localStream, endCall }) {
  const [minimize, setMinimize] = useState(false)

  return (
    <Draggable handle=".handle" bounds="body">
      <div
        className={cn(stl.wrapper, "fixed radius bg-white shadow-xl mt-16")}
        style={{ width: '280px' }}
      >
        <div className="handle flex items-center p-2 cursor-move select-none">
          <div className={stl.headerTitle}><b>Meeting</b> {userId}</div>
          <Counter startTime={new Date().getTime() } className="text-sm ml-auto" />          
        </div>
        <div className={cn(stl.videoWrapper, {'hidden' : minimize}, 'relative')}>
          <VideoContainer stream={ incomeStream } />
          <div className="absolute bottom-0 right-0 z-50">
            <VideoContainer stream={ localStream } muted width={50} />
          </div>
        </div>
        <ChatControls stream={localStream} endCall={endCall} />
      </div>
    </Draggable>
  )
}

export default ChatWindow

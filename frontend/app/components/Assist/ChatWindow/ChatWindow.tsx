import React, { useState, FC } from 'react'
import VideoContainer from '../components/VideoContainer'
import { Icon, Popup, Button } from 'UI'
import cn from 'classnames'
import Counter from 'App/components/shared/SessionItem/Counter'
import stl from './chatWindow.css'
import ChatControls from '../ChatControls/ChatControls'

export interface Props {
  incomeStream: MediaStream | null,
  localStream: MediaStream | null,
  userId: String,
  endCall: () => void
}

const ChatWindow: FC<Props> = function ChatWindow({ userId, incomeStream, localStream, endCall }) {
  const [minimize, setMinimize] = useState(false)

  return (
    <div    
      className={cn(stl.wrapper, "fixed radius bg-white z-50 shadow-xl mt-16")}
      style={{ width: '280px' }}
    >
      <div className="flex items-center p-2">
        <div>
          <div className={stl.headerTitle}><b>Meeting</b> {userId}</div>
          {/* <button onClick={() => setMinimize(!minimize)}>
            <Icon name={ minimize ? "plus" : "minus" } size="14" />
          </button> */}
        </div>
        <Counter startTime={new Date().getTime() } className="text-sm ml-auto" />
        {/* <Popup
          trigger={
            <button className="flex items-center ml-auto">
              <Icon name="high-engagement" size="16" color="teal" />
            </button>
          }
          content={ `Remote Control` }
          size="tiny"
          inverted
          position="top center"
        /> */}
      </div>
      <div className={cn({'hidden' : minimize}, 'relative')}>
        <VideoContainer stream={ incomeStream } />
        <div className="absolute bottom-0 right-0 z-50">
          <VideoContainer stream={ localStream } muted height={50} />
        </div>
      </div>
      <ChatControls stream={localStream} endCall={endCall} />
    </div>
  )
}

export default ChatWindow

import React, { useState, useEffect, FC } from 'react'
import VideoContainer from '../components/VideoContainer'
import { Icon, Popup } from 'UI'
import stl from './chatWindow.css'
import { callPeer } from 'App/player'
import cn from 'classnames'

export interface Props {
  inputStream: MediaStream | null,
  outputStream: MediaStream | null
  // call: (oStream: MediaStream, cb: (iStream: MediaStream)=>void)=>void
}

const ChatWindow: FC<Props> = function ChatWindow({ inputStream, outputStream }) {
  const [minimize, setMinimize] = useState(false)

  return (
    <div    
      className="fixed border radius bg-white z-50 shadow-xl mt-16 p-2"
      style={{ width: '220px' }}
    >
      <div className="flex items-center">
        <div>
          <button onClick={() => setMinimize(!minimize)}>
            <Icon name={ minimize ? "plus" : "minus" } size="14" />
          </button>
        </div>
        <Popup
          trigger={
            <button className="flex items-center ml-auto">
              <Icon name="high-engagement" size="16" color="teal" />
            </button>
          }
          content={ `Remote Control` }
          size="tiny"
          inverted
          position="top center"
        />
      </div>
      <div className={cn({'hidden' : minimize}, 'mt-2')}>
        <VideoContainer stream={ incomeStream } />
        <div className="py-1" />
        <VideoContainer stream={ localStream } muted/>
      </div>
    </div>    
  )
}

export default ChatWindow

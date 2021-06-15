import React from 'react'
import VideoContainer from '../VideoContainer/VideoContainer'
// impdort stl from './chatWindow.css'

function ChatWindow() {
  return (
    <div className="fixed border radius bg-white z-50 shadow-md">
      <div className="p-2">
        <VideoContainer /> 
      </div>
    </div>
  )
}

export default ChatWindow

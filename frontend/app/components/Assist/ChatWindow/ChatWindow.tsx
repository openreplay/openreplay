import React from 'react'
import VideoContainer from '../components/VideoContainer/VideoContainer'
// import stl from './chatWindow.css';

function ChatWindow() {
  return (
    <div className="fixed border radius bg-white z-50 shadow-xl mt-16">
      <div className="p-2">
        <VideoContainer />
        <div className="py-1" />
        <VideoContainer />
      </div>
    </div>
  )
}

export default ChatWindow

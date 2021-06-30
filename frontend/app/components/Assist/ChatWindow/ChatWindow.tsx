import React, { useState, useEffect, FC } from 'react';
import VideoContainer from '../components/VideoContainer';
import stl from './chatWindow.css';
import { callPeer } from 'App/player';

export interface Props {
  // call: (oStream: MediaStream, cb: (iStream: MediaStream)=>void)=>void
}

const ChatWindow: FC<Props> = function ChatWindow() {
  const [ inputStream, setInputStream ] = useState<MediaStream | null>(null);
  const [ outputStream, setOutputStream ] = useState<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({video:true, audio:true})
    .then(oStream => {
      setOutputStream(oStream);
      callPeer(oStream, setInputStream, () => {
        console.log('endd')
        outputStream?.getTracks().forEach(t => t.stop());
        //inputStream?.
      }); // Returns false when unable to connect.
                  // TODO: handle calling state
    })
    .catch(console.log) // TODO: handle error in ui
  }, [])

  return (    
    <div      
      className="fixed border radius bg-white z-50 shadow-xl mt-16"
    >
      <div className="p-2">
        <VideoContainer stream={ inputStream } />
        <div className="py-1" />
        <VideoContainer stream={ outputStream } muted/>
      </div>
    </div>    
  )
}

export default ChatWindow

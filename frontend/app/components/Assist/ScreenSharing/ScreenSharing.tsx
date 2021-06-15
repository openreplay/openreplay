import React from 'react'
import { Button } from 'UI'

function ScreenSharing() {
  const videoRef: React.RefObject<HTMLVideoElement> = React.createRef()

  function handleSuccess(stream) {
    // startButton.disabled = true;    
    // @ts-ignore
    videoRef.current.srcObject = stream;
    // @ts-ignore
    window.stream = stream; // make variable available to browser console    

    stream.getVideoTracks()[0].addEventListener('ended', () => {
      console.log('The user has ended sharing the screen');      
    });
  }
  
  function handleError(error) {
    console.log(`getDisplayMedia error: ${error.name}`, error);
  }

  const startScreenSharing = () => {
    // @ts-ignore
    navigator.mediaDevices.getDisplayMedia({video: true})
    .then(handleSuccess, handleError);
  }

  const stopScreenSharing = () => {   
    // @ts-ignore 
    window.stream.stop()
    console.log('Stop screen sharing')
  }

  return (
    <div className="fixed inset-0 z-50 bg-red">      
      <video ref={ videoRef } id="screen-share" autoPlay loop muted></video>
      <div className="absolute left-0 right-0 bottom-0">
        <Button onClick={startScreenSharing}>Start</Button>
        <Button onClick={stopScreenSharing}>Stop</Button>
      </div>
    </div>
  )
}

export default ScreenSharing

import React, { useEffect } from 'react'
import { Button, Icon } from 'UI'

function VideoContainer() {
  const constraints = {
    'video': true,
    'audio': true
  }

  async function playVideoFromCamera() {
    try {
        const constraints = {'video': true, 'audio': true};
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoElement = document.querySelector('video#localVideo');
        // videoElement.srcObject = stream;
    } catch(error) {
        console.error('Error opening video camera.', error);
    }
}

  function getConnectedDevices(type, callback) {
    navigator.mediaDevices.enumerateDevices()
        .then(devices => {
            const filtered = devices.filter(device => device.kind === type);
            callback(filtered);
        });
  }

  useEffect(() => {
    getConnectedDevices('videoinput', cameras => console.log('Cameras found', cameras));
    navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        console.log('Got MediaStream:', stream);
    })
    .catch(error => {
        console.error('Error accessing media devices.', error);
    });    
  }, [])
  return (
    <div className="relative h-20 bg-gray-light-shade border p-1" style={{ height: '160px', width: '200px' }}>      
      <div className="absolute left-0 right-0 bottom-0 flex justify-center border border-gray-300 p-1 bg-white radius">        
        <Button plain size="small">
          <Icon name="mic" size="20" />
        </Button>

        <Button plain size="small">
          <Icon name="camera-video" size="20" />
        </Button>
      </div>
    </div>
  )
}

export default VideoContainer

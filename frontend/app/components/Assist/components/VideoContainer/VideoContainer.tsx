import React, { useEffect, useRef } from 'react'
import { Button, Icon } from 'UI'

interface Props {
  stream: MediaProvider | null
  muted?: boolean
}

function VideoContainer({ stream, muted = false }: Props) {  
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [ ref.current, stream ])
  return (
    <div className="relative h-20 bg-gray-light-shade border p-1" style={{ height: '160px', width: '200px' }}>      
      <div className="absolute left-0 right-0 bottom-0 flex justify-center border border-gray-300 p-1 bg-white radius bg-opacity-25">        
        <video autoPlay ref={ ref } muted={ muted } />
        <Button plain size="small">
          <Icon name="mic" size="16" />
        </Button>

        <Button plain size="small">
          <Icon name="camera-video" size="16" />
        </Button>
      </div>
    </div>
  )
}

export default VideoContainer

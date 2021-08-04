import React, { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream | null
  muted?: boolean,
  width?: number
}

function VideoContainer({ stream, muted = false, width = 280 }: Props) {  
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [ ref.current, stream ])  

  return (
    <div>
      <video autoPlay ref={ ref } muted={ muted } style={{ width: width }} />
    </div>
  )
}

export default VideoContainer

import React, { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream | null
  muted?: boolean,
  height?: number
}

function VideoContainer({ stream, muted = false, height = 280 }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [isEnabled, setEnabled] = React.useState(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [ ref.current, stream, stream.getVideoTracks()[0]?.getSettings().width ])

  useEffect(() => {
    if (!stream) { return }
    const iid = setInterval(() => {
      const settings = stream.getVideoTracks()[0]?.getSettings()
      const isDummyVideoTrack = settings ? (settings.width === 2 || settings.frameRate === 0 || !settings.frameRate && !settings.width) : true
      const shouldBeEnabled = !isDummyVideoTrack
      isEnabled !== shouldBeEnabled ? setEnabled(shouldBeEnabled) : null;
    }, 500)
    return () => clearInterval(iid)
  }, [ stream, isEnabled ])

  return (
    <div className={"flex-1"} style={{ display: isEnabled ? undefined : 'none', width: isEnabled ? undefined : "0px!important" , height: isEnabled ? undefined : "0px!important" , border: "1px solid grey" }}>
      <video autoPlay ref={ ref } muted={ muted } style={{ height: height }} />
    </div>
  )
}

export default VideoContainer

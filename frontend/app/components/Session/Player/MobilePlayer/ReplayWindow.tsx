import React from 'react'
import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

interface Props {
  videoURL: string;
}

function ReplayWindow({ videoURL }: Props) {
  const playerContext = React.useContext(MobilePlayerContext);
  const videoRef = React.useRef<HTMLVideoElement>();

  const time = playerContext.store.get().time

  React.useEffect(() => {
    if (videoRef.current) {
      const timeSecs = time / 1000
      console.log(videoRef.current.duration, timeSecs)
      if (videoRef.current.duration >= timeSecs) {
        videoRef.current.currentTime = timeSecs
      }
    }
  }, [time])

  React.useEffect(() => {
    if (playerContext.player.screen.document && videoURL) {
      const videoEl = document.createElement('video')
      const sourceEl = document.createElement('source')
      videoEl.width = 300
      videoEl.height = 700
      sourceEl.setAttribute('src', videoURL)
      sourceEl.setAttribute('type', 'video/mp4')
      videoEl.appendChild(sourceEl)
      videoRef.current = videoEl
      playerContext.player.screen.document.body.appendChild(videoEl)
      playerContext.player.screen.iframeStylesRef.width = "340px"
      playerContext.player.screen.iframeStylesRef.height = "740px"
    }
  }, [videoURL, playerContext.player.screen.document])
  return (
    <div />
  )
}

export default observer(ReplayWindow);
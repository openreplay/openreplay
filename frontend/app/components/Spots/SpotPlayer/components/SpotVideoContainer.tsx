import React from 'react'
import spotPlayerStore from "../spotPlayerStore";
import { observer } from 'mobx-react-lite';

function SpotVideoContainer({ videoURL }: { videoURL: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const playbackTime = React.useRef(0)

  React.useEffect(() => {
    if (spotPlayerStore.isPlaying) {
      void videoRef.current?.play()
    } else {
      videoRef.current?.pause()
    }
  }, [spotPlayerStore.isPlaying])

  React.useEffect(() => {
    const int = setInterval(() => {
      const videoTime = videoRef.current?.currentTime ?? 0
      if (videoTime !== spotPlayerStore.time) {
        playbackTime.current = videoTime
        spotPlayerStore.setTime(videoTime)
      }
    }, 100)
    return () => clearInterval(int)
  }, [])

  React.useEffect(() => {
    if (playbackTime.current !== spotPlayerStore.time && videoRef.current) {
      videoRef.current.currentTime = spotPlayerStore.time
    }
  }, [spotPlayerStore.time])

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = spotPlayerStore.playbackRate
    }
  }, [spotPlayerStore.playbackRate])
  return (
    <video
      ref={videoRef}
      className={'object-contain absolute top-0 left-0 w-full h-full bg-gray-lightest cursor-pointer'}
      onClick={() => spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying)}
      src={videoURL}
    />
  )
}

export default observer(SpotVideoContainer)
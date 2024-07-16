import React from 'react'
import spotPlayerStore from "../spotPlayerStore";
import { observer } from 'mobx-react-lite';
import Hls from 'hls.js'

function SpotVideoContainer({ videoURL }: { videoURL: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const playbackTime = React.useRef(0)

  React.useEffect(() => {
    if (Hls.isSupported() && videoRef.current) {
      if (videoURL.includes('.m3u8')) {
        const hls = new Hls({ workerPath: '/hls-worker.js' })
        hls.loadSource(videoURL)
        hls.attachMedia(videoRef.current)
      } else {
        videoRef.current.src = videoURL
      }
    }
  }, [])

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

  const getTypeFromUrl = (url: string) => {
    const ext = url.split('.').pop()
    if (ext === 'mp4') {
      return 'video/mp4'
    }
    if (ext === 'webm') {
      return 'video/webm'
    }
    if (ext === 'ogg') {
      return 'video/ogg'
    }
    return 'video/mp4'
  }
  return (
    <video
      ref={videoRef}
      className={'object-contain absolute top-0 left-0 w-full h-full bg-gray-lightest cursor-pointer'}
      onClick={() => spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying)}
    />
  )
}

export default observer(SpotVideoContainer)
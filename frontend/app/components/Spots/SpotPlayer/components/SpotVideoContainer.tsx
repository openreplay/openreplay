import Hls from 'hls.js';
import { observer } from 'mobx-react-lite';
import React from 'react';
import spotPlayerStore from '../spotPlayerStore';

const base64toblob = (str: string) => {
  const byteCharacters = atob(str);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray]);
};

function SpotVideoContainer({
  videoURL,
  streamFile,
  thumbnail,
}: {
  videoURL: string;
  streamFile?: string;
  thumbnail?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const playbackTime = React.useRef(0);
  const hlsRef = React.useRef<Hls | null>(null);

  React.useEffect(() => {
    if (Hls.isSupported() && videoRef.current) {
      if (streamFile) {
        const hls = new Hls({
          workerPath: '/hls-worker.js',
          // 1MB buffer -- we have small videos anyways
          maxBufferSize: 1000 * 1000,
        });
      const url = URL.createObjectURL(base64toblob(streamFile));
        if (url && videoRef.current) {
          hls.loadSource(url);
          hls.attachMedia(videoRef.current);
          if (spotPlayerStore.isPlaying) {
            void videoRef.current.play();
          }
          hlsRef.current = hls;
        } else {
          if (videoRef.current) {
            videoRef.current.src = videoURL;
            if (spotPlayerStore.isPlaying) {
              void videoRef.current.play();
            }
          }
        }
      } else {
        videoRef.current.src = videoURL;
        if (spotPlayerStore.isPlaying) {
          void videoRef.current.play();
        }
      }
    } else {
      if (videoRef.current) {
        videoRef.current.src = videoURL;
        if (spotPlayerStore.isPlaying) {
          void videoRef.current.play();
        }
      }
    }
    return () => {
      hlsRef.current?.destroy();
    };
  }, []);

  React.useEffect(() => {
    if (spotPlayerStore.isPlaying) {
      videoRef.current
        ?.play()
        .then((r) => {
          console.log('started', r);
        })
        .catch((e) => console.error(e));
    } else {
      videoRef.current?.pause();
    }
  }, [spotPlayerStore.isPlaying]);

  React.useEffect(() => {
    const int = setInterval(() => {
      const videoTime = videoRef.current?.currentTime ?? 0;
      if (videoTime !== spotPlayerStore.time) {
        playbackTime.current = videoTime;
        spotPlayerStore.setTime(videoTime);
      }
    }, 100);
    return () => clearInterval(int);
  }, []);

  React.useEffect(() => {
    if (playbackTime.current !== spotPlayerStore.time && videoRef.current) {
      videoRef.current.currentTime = spotPlayerStore.time;
    }
  }, [spotPlayerStore.time]);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = spotPlayerStore.playbackRate;
    }
  }, [spotPlayerStore.playbackRate]);
  return (
    <>
      <video
        ref={videoRef}
        className={
          'object-contain absolute top-0 left-0 w-full h-full bg-gray-lightest cursor-pointer z-20'
        }
        onClick={() => spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying)}
      />
      <img src={thumbnail} alt={'spot thumbnail'} className={'z-10 object-contain absolute top-0 left-0 w-full h-full bg-gray-lightest pointer-events-none'} />
    </>
  );
}

export default observer(SpotVideoContainer);

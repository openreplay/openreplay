import { InfoCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Alert, Button } from 'antd';
import { MediaPlayer, type MediaPlayerClass } from 'dashjs';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import spotPlayerStore from '../spotPlayerStore';

const base64ToBlob = (str: string) => {
  const byteCharacters = atob(str);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteArray]);
};

const isMpdFormat = (base64Str: string): boolean => {
  try {
    const decoded = atob(base64Str.slice(0, 100));
    return decoded.includes('<?xml') || decoded.includes('<MPD');
  } catch {
    return false;
  }
};

enum ProcessingState {
  Unchecked,
  Processing,
  Ready,
}

interface SpotVideoContainerProps {
  videoURL: string;
  streamFile?: string;
  thumbnail?: string;
  checkReady: () => Promise<boolean>;
}

function SpotVideoContainer({
  videoURL,
  streamFile,
  thumbnail,
  checkReady,
}: SpotVideoContainerProps) {
  const { t } = useTranslation();
  const [prevIsProcessing, setPrevIsProcessing] = React.useState(false);
  const [processingState, setProcessingState] = React.useState(
    ProcessingState.Unchecked,
  );
  const [isLoaded, setLoaded] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const playbackTime = React.useRef(0);
  const dashRef = React.useRef<MediaPlayerClass | null>(null);
  const blobUrlRef = React.useRef<string | null>(null);

  // Initialize player and check processing state
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let checkInterval: ReturnType<typeof setInterval> | undefined;
    let checkTimeout: ReturnType<typeof setTimeout> | undefined;
    let checkAmount = 0;

    const onLoadedData = () => setLoaded(true);
    const onEnded = () => spotPlayerStore.onComplete();

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('ended', onEnded);

    const initDash = (url: string) => {
      const dash = MediaPlayer().create();
      dash.updateSettings({
        streaming: {
          scheduling: { scheduleWhilePaused: true },
        },
        debug: { logLevel: 3 },
      });
      dash.initialize(video, url, spotPlayerStore.isPlaying);
      dashRef.current = dash;
    };

    const initializeVideo = () => {
      if (streamFile && isMpdFormat(streamFile)) {
        const url = URL.createObjectURL(base64ToBlob(streamFile));
        blobUrlRef.current = url;
        initDash(url);
      } else if (streamFile) {
        // Old HLS format - fall back to original videoURL (WebM)
        video.src = videoURL;
      } else {
        const pollVideo = () => {
          fetch(videoURL).then((r) => {
            if (r.ok && r.status === 200) {
              initDash(videoURL);
            } else {
              if (checkAmount >= 60) {
                return;
              }
              checkTimeout = setTimeout(pollVideo, 1000);
              checkAmount += 1;
            }
          });
        };
        pollVideo();
      }
    };

    checkReady().then((isReady) => {
      if (!isReady) {
        setProcessingState(ProcessingState.Processing);
        setPrevIsProcessing(true);
        let attempts = 0;
        checkInterval = setInterval(() => {
          attempts += 1;
          if (attempts >= 12) {
            clearInterval(checkInterval);
            return;
          }
          checkReady().then((r) => {
            if (r) {
              setProcessingState(ProcessingState.Ready);
              clearInterval(checkInterval);
            }
          });
        }, 5000);
      } else {
        setProcessingState(ProcessingState.Ready);
      }
      initializeVideo();
    });

    return () => {
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('ended', onEnded);
      dashRef.current?.destroy();
      clearInterval(checkInterval);
      clearTimeout(checkTimeout);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // Sync play/pause state
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (spotPlayerStore.isPlaying) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [spotPlayerStore.isPlaying]);

  // Sync video time to store
  React.useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      const videoTime = video.currentTime;
      if (Math.abs(videoTime - spotPlayerStore.time) > 0.05) {
        playbackTime.current = videoTime;
        spotPlayerStore.setTime(videoTime);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Handle user-initiated seeks from store
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const timeDiff = Math.abs(playbackTime.current - spotPlayerStore.time);
    if (timeDiff > 0.5) {
      video.currentTime = spotPlayerStore.time;
    }
  }, [spotPlayerStore.time]);

  // Sync playback rate
  React.useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = spotPlayerStore.playbackRate;
    }
  }, [spotPlayerStore.playbackRate]);

  return (
    <>
      <div
        className="absolute z-20 left-2/4 -top-6"
        style={{ transform: 'translate(-50%, 0)' }}
      >
        {processingState === ProcessingState.Processing ? (
          <Alert
            className="trimIsProcessing rounded-lg shadow-sm border-indigo-500 bg-indigo-lightest"
            title="You're viewing the original recording. Processed Spot will be available here shortly."
            showIcon
            type="info"
            icon={<InfoCircleOutlined style={{ color: '#394dfe' }} />}
          />
        ) : prevIsProcessing ? (
          <Alert
            className="trimIsReady rounded-lg shadow-xs border-0"
            title="Your processed Spot is ready!"
            showIcon
            type="success"
            action={
              <Button
                size="small"
                type="default"
                icon={<PlayCircleOutlined />}
                onClick={() => window.location.reload()}
                className="ml-2"
              >
                {t('Play Now')}
              </Button>
            }
          />
        ) : null}
      </div>

      {!isLoaded && (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-white/50">
          <img
            src="/assets/img/videoProcessing.svg"
            alt="Processing video.."
            width={75}
            className="mb-5"
          />
          <div className="text-2xl font-bold">Loading Spot Recording...</div>
        </div>
      )}
      <video
        ref={videoRef}
        poster={thumbnail}
        autoPlay
        playsInline
        className="object-contain absolute top-0 left-0 w-full h-full bg-gray-lightest cursor-pointer"
        onClick={() => spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying)}
        style={{ display: isLoaded ? 'block' : 'none' }}
      />
    </>
  );
}

export default observer(SpotVideoContainer);

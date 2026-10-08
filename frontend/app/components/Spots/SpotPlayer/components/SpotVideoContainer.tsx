import { Button } from '@/ui/actions/button';
import type { MediaPlayerClass } from 'dashjs';
import { CheckCircle2, Info, Loader2, PlayCircle } from 'lucide-react';
import { reaction } from 'mobx';
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
    // async steps below must not start a player or a poll after unmount
    let cancelled = false;

    const onLoadedData = () => setLoaded(true);
    const onEnded = () => spotPlayerStore.onComplete();

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('ended', onEnded);

    // dashjs (~236KB gz) only for MPD streams
    const initDash = async (url: string) => {
      const { MediaPlayer } = await import('dashjs');
      if (cancelled) return;
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
        initDash(url).catch((e) => {
          // the player chunk failed to load: the original WebM still plays
          console.error('Failed to load the MPD player', e);
          if (!cancelled) video.src = videoURL;
        });
      } else if (streamFile) {
        // Old HLS format - fall back to original videoURL (WebM)
        video.src = videoURL;
      } else {
        const pollVideo = () => {
          fetch(videoURL).then((r) => {
            if (cancelled) return;
            if (r.ok && r.status === 200) {
              video.src = videoURL;
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
      if (cancelled) return;
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
            if (r && !cancelled) {
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
      cancelled = true;
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

  // play/pause and seeks follow the store through reactions: reading the
  // store's time during render re-rendered this whole container ~10x a second
  React.useEffect(
    () =>
      reaction(
        () => spotPlayerStore.isPlaying,
        (playing) => {
          const video = videoRef.current;
          if (!video) return;
          if (playing)
            video.play().catch((e: DOMException) => {
              // autoplay blocked (a link opened in a new tab): show it paused
              if (e.name === 'NotAllowedError')
                spotPlayerStore.setIsPlaying(false);
            });
          else video.pause();
        },
        { fireImmediately: true },
      ),
    [],
  );

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

  // user-initiated seeks: a store time far from the video's own position
  React.useEffect(
    () =>
      reaction(
        () => spotPlayerStore.time,
        (time) => {
          const video = videoRef.current;
          if (!video) return;
          if (Math.abs(playbackTime.current - time) > 0.5) {
            video.currentTime = time;
          }
        },
      ),
    [],
  );

  // Sync playback rate
  React.useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = spotPlayerStore.playbackRate;
    }
  }, [spotPlayerStore.playbackRate]);

  return (
    <>
      {processingState === ProcessingState.Processing ? (
        <div className="m-spotp__notice" role="status">
          <Info size={13} aria-hidden="true" />
          {t(
            "You're viewing the original recording. Processed Spot will be available here shortly.",
          )}
        </div>
      ) : prevIsProcessing ? (
        <div className="m-spotp__notice is-ready" role="status">
          <CheckCircle2 size={13} aria-hidden="true" />
          {t('Your processed Spot is ready!')}
          <Button onClick={() => window.location.reload()}>
            <PlayCircle size={13} />
            {t('Play now')}
          </Button>
        </div>
      ) : null}

      {!isLoaded && (
        <div className="m-spotp__loading">
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          {t('Loading the recording…')}
        </div>
      )}
      <video
        ref={videoRef}
        poster={thumbnail}
        autoPlay
        playsInline
        className="object-contain absolute top-0 left-0 w-full h-full bg-surface-canvas cursor-pointer"
        onClick={() => spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying)}
        style={{ display: isLoaded ? 'block' : 'none' }}
      />
    </>
  );
}

export default observer(SpotVideoContainer);

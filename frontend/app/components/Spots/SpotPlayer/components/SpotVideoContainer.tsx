import { InfoCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { Alert, Button } from 'antd';
import Hls from 'hls.js';
import { observer } from 'mobx-react-lite';
import React from 'react';

import spotPlayerStore from '../spotPlayerStore';
import { useTranslation } from 'react-i18next';

const base64toblob = (str: string) => {
  const byteCharacters = atob(str);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray]);
};

enum ProcessingState {
  Unchecked,
  Processing,
  Ready,
}

function SpotVideoContainer({
  videoURL,
  streamFile,
  thumbnail,
  checkReady,
}: {
  videoURL: string;
  streamFile?: string;
  thumbnail?: string;
  checkReady: () => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [prevIsProcessing, setPrevIsProcessing] = React.useState(false);
  const [processingState, setProcessingState] = React.useState<ProcessingState>(
    ProcessingState.Unchecked,
  );
  const [isLoaded, setLoaded] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const playbackTime = React.useRef(0);
  const hlsRef = React.useRef<Hls | null>(null);

  React.useEffect(() => {
    const startPlaying = () => {
      if (spotPlayerStore.isPlaying && videoRef.current) {
        videoRef.current
          .play()
          .then(() => {
            console.debug('playing');
          })
          .catch((e) => {
            console.error(e);
            spotPlayerStore.setIsPlaying(false);
            const onClick = () => {
              spotPlayerStore.setIsPlaying(true);
              document.removeEventListener('click', onClick);
            };
            document.addEventListener('click', onClick);
          });
      }
    };
    checkReady().then((isReady) => {
      if (!isReady) {
        setProcessingState(ProcessingState.Processing);
        setPrevIsProcessing(true);
        const int = setInterval(() => {
          checkReady().then((r) => {
            if (r) {
              setProcessingState(ProcessingState.Ready);
              clearInterval(int);
            }
          });
        }, 5000);
      } else {
        setProcessingState(ProcessingState.Ready);
      }
      import('hls.js').then(({ default: Hls }) => {
        const isSafari = /^((?!chrome|android).)*safari/i.test(
          navigator.userAgent,
        );
        if (Hls.isSupported() && videoRef.current) {
          if (isSafari) {
            setLoaded(true);
          } else {
            videoRef.current.addEventListener('loadeddata', () => {
              setLoaded(true);
            });
          }
          if (streamFile) {
            const hls = new Hls({
              enableWorker: true,
              maxBufferSize: 1000 * 1000,
            });
            const url = URL.createObjectURL(base64toblob(streamFile));
            if (url && videoRef.current) {
              hls.loadSource(url);
              hls.attachMedia(videoRef.current);
              startPlaying();
              hlsRef.current = hls;
            } else if (videoRef.current) {
              videoRef.current.src = videoURL;
              startPlaying();
            }
          } else {
            const check = () => {
              fetch(videoURL).then((r) => {
                if (r.ok && r.status === 200) {
                  if (videoRef.current) {
                    videoRef.current.src = '';
                    setTimeout(() => {
                      videoRef.current!.src = videoURL;
                      startPlaying();
                    }, 0);
                  }

                  return true;
                }
                setTimeout(() => {
                  check();
                }, 1000);
              });
            };
            check();
          }
        } else if (
          streamFile &&
          videoRef.current &&
          videoRef.current.canPlayType('application/vnd.apple.mpegurl')
        ) {
          setLoaded(true);
          videoRef.current.src = URL.createObjectURL(base64toblob(streamFile));
          startPlaying();
        } else if (videoRef.current) {
          videoRef.current.addEventListener('loadeddata', () => {
            setLoaded(true);
          });
          videoRef.current.src = videoURL;
          startPlaying();
        }
      });
    });
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
    if (videoRef.current) {
      videoRef.current.addEventListener('ended', () => {
        spotPlayerStore.onComplete();
      });
    }
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

  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <>
      <div
        className="absolute z-20 left-2/4 -top-6"
        style={{ transform: 'translate(-50%, 0)' }}
      >
        {processingState === ProcessingState.Processing ? (
          <Alert
            className="trimIsProcessing rounded-lg shadow-sm border-indigo-500 bg-indigo-50"
            message="You’re viewing the original recording. Processed Spot will be available here shortly."
            showIcon
            type="info"
            icon={<InfoCircleOutlined style={{ color: '#394dfe' }} />}
          />
        ) : prevIsProcessing ? (
          <Alert
            className="trimIsReady rounded-lg shadow-sm border-0"
            message="Your processed Spot is ready!"
            showIcon
            type="success"
            action={
              <Button
                size="small"
                type="default"
                icon={<PlayCircleOutlined />}
                onClick={reloadPage}
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

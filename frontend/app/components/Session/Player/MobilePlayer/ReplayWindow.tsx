import { PlayerMode } from 'Player';
import React from 'react';
import {
  MobilePlayerContext,
  IOSPlayerContext,
} from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import {
  mapIphoneModel,
  mapAndroidModel,
  appleIcon,
  androidIcon,
} from 'Player/mobile/utils';

interface Props {
  videoURL: string[];
  userDevice: string;
  isAndroid: boolean;
  screenWidth: number;
  screenHeight: number;
  isClips?: boolean;
}

function ReplayWindow({
  videoURL,
  userDevice,
  screenHeight,
  screenWidth,
  isAndroid,
  isClips,
}: Props) {
  const playerContext = React.useContext<IOSPlayerContext>(MobilePlayerContext);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const shellRef = React.useRef<HTMLDivElement>(null);
  const videoContainerRef = React.useRef<HTMLDivElement>(null);

  const {
    time,
    currentSnapshot,
    mode,
    orientation: phoneOrientation,
  } = playerContext.store.get();

  let phoneShell: string;
  let styles: Record<string, any>;
  if (!isAndroid) {
    const { svg: iphoneShellSvg, styles: iphoneStyles } =
      mapIphoneModel(userDevice);
    phoneShell = iphoneShellSvg;
    styles = iphoneStyles;
  } else {
    const { svg: androidShell, styles: androidStyles } = mapAndroidModel(
      screenWidth,
      screenHeight,
    );
    phoneShell = androidShell;
    styles = androidStyles;
  }

  React.useEffect(() => {
    if (videoRef.current && mode === PlayerMode.VIDEO) {
      const timeSecs = time / 1000;
      const delta = videoRef.current.currentTime - timeSecs;
      if (videoRef.current.duration >= timeSecs && Math.abs(delta) > 0.1) {
        videoRef.current.currentTime = timeSecs;
      }
    }
  }, [time, mode]);

  React.useEffect(() => {
    if (currentSnapshot && mode === PlayerMode.SNAPS) {
      const blob = currentSnapshot.getBlobUrl();
      if (imageRef.current) {
        imageRef.current.src = blob;
      }
    }
    return () => {
      if (imageRef.current) {
        URL.revokeObjectURL(imageRef.current.src);
      }
    };
  }, [currentSnapshot, mode]);

  React.useEffect(() => {
    playerContext.player.pause();
    if (!containerRef.current && playerContext.player.screen.document) {
      const host = document.createElement('div');
      const shell = document.createElement('div');
      const icon = document.createElement('div');
      const videoContainer = document.createElement('div');

      videoContainer.style.borderRadius = '10px';
      videoContainer.style.overflow = 'hidden';
      videoContainer.style.margin = styles.margin;
      videoContainer.style.display = 'none';
      videoContainer.style.width = `${styles.screen.width}px`;
      videoContainer.style.height = `${styles.screen.height}px`;

      shell.innerHTML = phoneShell;
      Object.assign(icon.style, mobileIconStyle(styles));
      const spacer = document.createElement('div');
      spacer.style.width = '60px';
      spacer.style.height = '60px';

      const loadingBar = document.createElement('div');
      Object.assign(loadingBar.style, mobileLoadingBarStyle(styles));

      icon.innerHTML = isAndroid ? androidIcon : appleIcon;

      shell.style.position = 'absolute';
      shell.style.top = '0';

      host.appendChild(videoContainer);
      host.appendChild(shell);

      icon.appendChild(spacer);
      icon.appendChild(loadingBar);
      host.appendChild(icon);

      containerRef.current = host;
      shellRef.current = shell;
      videoContainerRef.current = videoContainer;

      videoContainer.id = '___or_replay-video';
      icon.id = '___or_mobile-loader-icon';
      host.id = '___or_mobile-player';

      playerContext.player.injectPlayer(host, isClips);
      playerContext.player.customScale(styles.shell.width, styles.shell.height);
      playerContext.player.updateDimensions({
        width: styles.screen.width,
        height: styles.screen.height,
      });
      playerContext.player.updateOverlayStyle({
        margin: styles.margin,
        width: `${styles.screen.width}px`,
        height: `${styles.screen.height}px`,
      });
    }
  }, [playerContext.player.screen.document]);

  React.useEffect(() => {
    if (mode) {
      const host = containerRef.current;
      const videoContainer =
        playerContext.player.screen.document?.getElementById(
          '___or_replay-video',
        );
      const icon = playerContext.player.screen.document?.getElementById(
        '___or_mobile-loader-icon',
      );
      if (host && videoContainer && icon) {
        if (mode === PlayerMode.SNAPS) {
          const imagePlayer = document.createElement('img');
          imagePlayer.style.width = `${styles.screen.width}px`;
          imagePlayer.style.height = `${styles.screen.height}px`;
          imagePlayer.style.backgroundColor = '#333';

          videoContainer.appendChild(imagePlayer);
          const removeLoader = () => {
            host.removeChild(icon);
            videoContainer.style.display = 'block';
            imagePlayer.removeEventListener('load', removeLoader);
          };
          imagePlayer.addEventListener('load', removeLoader);
          imageRef.current = imagePlayer;
          playerContext.player.play();
        }
        if (mode === PlayerMode.VIDEO) {
          const mp4URL = videoURL.find((url) => url.includes('.mp4'));
          if (mp4URL) {
            const videoEl = document.createElement('video');
            const sourceEl = document.createElement('source');

            videoContainer.appendChild(videoEl);

            videoEl.width = styles.screen.width;
            videoEl.height = styles.screen.height;
            videoEl.style.backgroundColor = '#333';
            videoEl.style.maxWidth = '100%';
            videoEl.style.maxHeight = '100%';

            sourceEl.setAttribute('src', mp4URL);
            sourceEl.setAttribute('type', 'video/mp4');
            videoEl.appendChild(sourceEl);

            videoEl.addEventListener('loadeddata', () => {
              host.removeChild(icon);
              (videoContainer as HTMLDivElement).style.display = 'block';
              playerContext.player.play();
            });

            videoRef.current = videoEl;
          }
        }
      }
    }
  }, [videoURL, playerContext.player.screen.document, mode]);

  const applyOrientation = React.useCallback(
    (orientation: 'portrait' | 'landscapeLeft' | 'landscapeRight') => {
      const shell = shellRef.current;
      const videoContainer = videoContainerRef.current;
      if (!shell || !videoContainer) return;

      const shellW = styles.shell.width;
      const shellH = styles.shell.height;
      const screenW = styles.screen.width;
      const screenH = styles.screen.height;

      const isLandscape = orientation.includes('landscape');
      const angle = !isLandscape
        ? 0
        : orientation === 'landscapeLeft'
          ? 90
          : -90;

      shell.style.transformOrigin = 'top left';
      if (angle === 90) {
        shell.style.transform = `rotate(90deg) translate(0px, -100%)`;
      } else if (angle === -90) {
        shell.style.transform = `rotate(-90deg) translate(-100%, 0px)`;
      } else {
        shell.style.transform = `rotate(0deg) translate(0px, 0px)`;
      }

      const newW = isLandscape ? screenH : screenW;
      const newH = isLandscape ? screenW : screenH;

      playerContext.player.updateDimensions({ width: newW, height: newH });
      playerContext.player.updateOverlayStyle({
        margin: styles.margin,
        width: `${newW}px`,
        height: `${newH}px`,
      });

      (videoContainer as HTMLDivElement).style.width = `${newW}px`;
      (videoContainer as HTMLDivElement).style.height = `${newH}px`;
      if (videoRef.current) {
        videoRef.current.width = newW;
        videoRef.current.height = newH;
        videoRef.current.style.width = `${newW}px`;
        videoRef.current.style.height = `${newH}px`;
      }
      if (imageRef.current) {
        imageRef.current.style.width = `${newW}px`;
        imageRef.current.style.height = `${newH}px`;
      }

      playerContext.player.customScale(
        isLandscape ? shellH : shellW,
        isLandscape ? shellW : shellH,
      );
    },
    [playerContext.player, styles],
  );

  React.useEffect(() => {
    if (!containerRef.current) return;
    applyOrientation(phoneOrientation as any);
  }, [phoneOrientation, applyOrientation]);

  return <div />;
}

const mobileLoadingBarStyle = (styles: any) => ({
  width: `${styles.screen.width / 2}px`,
  height: '6px',
  borderRadius: '3px',
  backgroundColor: 'white',
});
const mobileIconStyle = (styles: any) => ({
  backgroundColor: '#333',
  borderRadius: '10px',
  width: `${styles.screen.width}px`,
  height: `${styles.screen.height}px`,
  margin: styles.margin,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
});

export default observer(ReplayWindow);

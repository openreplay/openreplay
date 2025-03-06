import React from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

function VideoJS(props: {
  options: Record<string, any>;
  onReady: (pl: any) => void;
}) {
  const videoRef = React.useRef<HTMLDivElement>(null);
  const playerRef = React.useRef<ReturnType<typeof videojs>>(null);
  const { options, onReady } = props;

  React.useEffect(() => {
    if (!playerRef.current) {
      const videoElement = document.createElement('video-js');

      videoElement.classList.add('vjs-big-play-centered');
      if (videoRef.current) {
        videoRef.current.appendChild(videoElement);
      }

      const player = (playerRef.current = videojs(videoElement, options, () => {
        videojs.log('player is ready');
        onReady && onReady(player);
      }));
      player.volume(1); // Set volume to maximum
      player.muted(false);
    } else {
      const player = playerRef.current;

      player.autoplay(options.autoplay);
      player.src(options.sources);
      player.volume(1); // Set volume to maximum
      player.muted(false);
    }
  }, [options, videoRef]);

  React.useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div
      ref={videoRef}
      data-vjs-player
      style={{ height: '100%', width: '100%' }}
    />
  );
}

export default VideoJS;

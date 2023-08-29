import React from 'react'
import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { mapIphoneModel } from "Player/mobile/utils";

interface Props {
  videoURL: string;
  userDevice: string;
}

function ReplayWindow({ videoURL, userDevice }: Props) {
  const playerContext = React.useContext(MobilePlayerContext);
  const videoRef = React.useRef<HTMLVideoElement>();

  const time = playerContext.store.get().time

  React.useEffect(() => {
    if (videoRef.current) {
      const timeSecs = time / 1000
      if (videoRef.current.duration >= timeSecs) {
        videoRef.current.currentTime = timeSecs
      }
    }
  }, [time])

  React.useEffect(() => {
    if (playerContext.player.screen.document && videoURL) {
      const host = document.createElement('div')
      const videoEl = document.createElement('video')
      const sourceEl = document.createElement('source')
      const shell = document.createElement('div')
      const { svg, styles } = mapIphoneModel(userDevice)
      shell.innerHTML = svg

      videoEl.width = styles.screen.width
      videoEl.height = styles.screen.height
      videoEl.style.margin = styles.margin
      shell.style.position = 'absolute'

      sourceEl.setAttribute('src', videoURL)
      sourceEl.setAttribute('type', 'video/mp4')

      host.appendChild(shell)
      host.appendChild(videoEl)
      videoEl.appendChild(sourceEl)

      videoRef.current = videoEl
      playerContext.player.injectPlayer(host)
      playerContext.player.customScale(styles.shell.width, styles.shell.height)
    }
  }, [videoURL, playerContext.player.screen.document])
  return (
    <div />
  )
}

export default observer(ReplayWindow);
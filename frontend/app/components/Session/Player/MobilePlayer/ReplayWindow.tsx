import React from 'react'
import { MobilePlayerContext, IOSPlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { mapIphoneModel } from "Player/mobile/utils";

interface Props {
  videoURL: string;
  userDevice: string;
}

const appleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" fill="white" viewBox="0 0 16 16">
  <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516.024.034 1.52.087 2.475-1.258.955-1.345.762-2.391.728-2.43Zm3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422.212-2.189 1.675-2.789 1.698-2.854.023-.065-.597-.79-1.254-1.157a3.692 3.692 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56.244.729.625 1.924 1.273 2.796.576.984 1.34 1.667 1.659 1.899.319.232 1.219.386 1.843.067.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758.347-.79.505-1.217.473-1.282Z"/>
  <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516.024.034 1.52.087 2.475-1.258.955-1.345.762-2.391.728-2.43Zm3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422.212-2.189 1.675-2.789 1.698-2.854.023-.065-.597-.79-1.254-1.157a3.692 3.692 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56.244.729.625 1.924 1.273 2.796.576.984 1.34 1.667 1.659 1.899.319.232 1.219.386 1.843.067.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758.347-.79.505-1.217.473-1.282Z"/>
</svg>`

function ReplayWindow({ videoURL, userDevice }: Props) {
  const playerContext = React.useContext<IOSPlayerContext>(MobilePlayerContext);
  const videoRef = React.useRef<HTMLVideoElement>();

  const time = playerContext.store.get().time

  React.useEffect(() => {
    if (videoRef.current) {
      const timeSecs = time / 1000
      const delta = videoRef.current.currentTime - timeSecs
      if (videoRef.current.duration >= timeSecs && Math.abs(delta) > 0.1) {
        videoRef.current.currentTime = timeSecs
      }
    }
  }, [time])

  React.useEffect(() => {
    if (playerContext.player.screen.document && videoURL) {
      playerContext.player.pause()
      const { svg, styles } = mapIphoneModel(userDevice)

      const host = document.createElement('div')
      const videoEl = document.createElement('video')
      const sourceEl = document.createElement('source')
      const shell = document.createElement('div')
      const icon = document.createElement('div')
      const videoContainer = document.createElement('div')

      videoContainer.style.borderRadius = '10px'
      videoContainer.style.overflow = 'hidden'
      videoContainer.style.margin = styles.margin
      videoContainer.style.display = 'none'
      videoContainer.style.width = styles.screen.width + 'px'
      videoContainer.style.height = styles.screen.height + 'px'

      videoContainer.appendChild(videoEl)

      shell.innerHTML = svg

      videoEl.width = styles.screen.width
      videoEl.height = styles.screen.height
      videoEl.style.backgroundColor = '#333'

      Object.assign(icon.style, {
        backgroundColor: '#333',
        borderRadius: '10px',
        width: styles.screen.width + 'px',
        height: styles.screen.height + 'px',
        margin: styles.margin,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      })
      const spacer = document.createElement('div')
      spacer.style.width = '60px'
      spacer.style.height = '60px'

      const loadingBar = document.createElement('div')
      Object.assign(loadingBar.style, {
        width: styles.screen.width/2 + 'px',
        height: '6px',
        borderRadius: '3px',
        backgroundColor: 'white',
      })
      icon.innerHTML = appleIcon
      icon.appendChild(spacer)
      icon.appendChild(loadingBar)

      shell.style.position = 'absolute'
      shell.style.top = '0'

      sourceEl.setAttribute('src', videoURL)
      sourceEl.setAttribute('type', 'video/mp4')

      host.appendChild(videoContainer)
      host.appendChild(shell)
      host.appendChild(icon)
      videoEl.appendChild(sourceEl)

      videoEl.addEventListener("loadeddata", () => {
        videoContainer.style.display = 'block'
        icon.style.display = 'none'
        host.removeChild(icon)
        console.log('loaded')
        playerContext.player.play()
      })

      videoRef.current = videoEl
      playerContext.player.injectPlayer(host)
      playerContext.player.customScale(styles.shell.width, styles.shell.height)
      playerContext.player.updateDimensions({
        width: styles.screen.width,
        height: styles.screen.height,
      })
      playerContext.player.updateOverlayStyle({
        margin: styles.margin,
        width: styles.screen.width + 'px',
        height: styles.screen.height + 'px',
      })
    }
  }, [videoURL, playerContext.player.screen.document])
  return (
    <div />
  )
}

export default observer(ReplayWindow);
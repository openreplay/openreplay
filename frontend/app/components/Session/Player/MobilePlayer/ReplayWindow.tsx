import React from 'react'
import { MobilePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';

const iPhone12ProSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"438\" height=\"883\" fill=\"none\" xmlns:v=\"https://vecta.io/nano\"><path fill-rule=\"evenodd\" d=\"M70.284.332h298c35.898 0 65 29.102 65 65v752c0 35.898-29.102 65-65 65h-298c-35.899 0-65-29.102-65-65v-752c0-35.898 29.102-65 65-65zm0 19c-25.405 0-46 20.595-46 46v752c0 25.405 20.595 46 46 46h298c25.405 0 46-20.595 46-46v-752c0-25.405-20.595-46-46-46h-298z\" fill=\"#000\"/><path d=\"M433.284 262.897h2.5a2 2 0 0 1 2 2v98.625a2 2 0 0 1-2 2h-2.5V262.897zM.784 327.332a2 2 0 0 1 2-2h2.5v63.996h-2.5a2 2 0 0 1-2-2v-59.996zm0-85a2 2 0 0 1 2-2h2.5v63.996h-2.5a2 2 0 0 1-2-2v-59.996z\" fill=\"#222\"/><path d=\"M.784 179.332a2 2 0 0 1 2-2h2.5v32h-2.5a2 2 0 0 1-2-2v-28z\" fill=\"#444\"/><path d=\"M123.735 18.949V6.174h189.803v12.775h-8.775a4 4 0 0 0-4 4v7.215c0 12.15-9.85 22-22 22H160.335c-12.15 0-22-9.85-22-22v-7.215a4 4 0 0 0-4-4h-10.6z\" fill=\"#000\"/><circle opacity=\".34\" cx=\"161.528\" cy=\"30.219\" r=\"5.62\" fill=\"url(#A)\"/><circle opacity=\".34\" cx=\"163.865\" cy=\"32.417\" r=\"1.283\" fill=\"url(#B)\"/><path opacity=\".2\" fill-rule=\"evenodd\" d=\"M166.16 30.219a4.49 4.49 0 0 0 .02-.436c0-2.569-2.083-4.652-4.652-4.652s-4.652 2.083-4.652 4.652l.02.436c.22-2.365 2.21-4.216 4.632-4.216s4.412 1.851 4.632 4.216z\" fill=\"#fff\"/><defs><linearGradient id=\"A\" x1=\"164.111\" y1=\"29.357\" x2=\"155.908\" y2=\"29.493\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#2983ab\"/><stop offset=\"1\" stop-color=\"#1948ab\"/></linearGradient><linearGradient id=\"B\" x1=\"162.143\" y1=\"31.133\" x2=\"165.148\" y2=\"33.7\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#fff\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#fff\"/></linearGradient></defs></svg>"
const iPhone12ProMaxSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"476\" height=\"965\" fill=\"none\" xmlns:v=\"https://vecta.io/nano\"><path fill-rule=\"evenodd\" d=\"M69.495.332h336.001c35.898 0 65 29.102 65 65v834c0 35.898-29.102 65-65 65h-336c-35.899 0-65-29.102-65-65v-834c0-35.898 29.101-65 65-65zm0 19c-25.405 0-46 20.595-46 46v834c0 25.405 20.595 46 46 46h336.001c25.405 0 46-20.595 46-46v-834c0-25.405-20.595-46-46-46h-336z\" fill=\"#000\"/><path d=\"M470.142 281.897h2.5a2 2 0 0 1 2 2v98.625a2 2 0 0 1-2 2h-2.5V281.897zM.642 346.332a2 2 0 0 1 2-2h2.5v63.996h-2.5a2 2 0 0 1-2-2v-59.996zm0-85a2 2 0 0 1 2-2h2.5v63.996h-2.5a2 2 0 0 1-2-2v-59.996z\" fill=\"#222\"/><path d=\"M.642 198.332a2 2 0 0 1 2-2h2.5v32h-2.5a2 2 0 0 1-2-2v-28z\" fill=\"#444\"/><path d=\"M142.741 18.949V6.174h189.802v12.775h-8.775a4 4 0 0 0-4 4v7.215c0 12.15-9.85 22-22 22H179.341c-12.15 0-22-9.85-22-22v-7.215a4 4 0 0 0-4-4h-10.6z\" fill=\"#000\"/><circle opacity=\".34\" cx=\"180.533\" cy=\"30.219\" r=\"5.62\" fill=\"url(#A)\"/><circle opacity=\".34\" cx=\"182.87\" cy=\"32.417\" r=\"1.283\" fill=\"url(#B)\"/><path opacity=\".2\" fill-rule=\"evenodd\" d=\"M185.166 30.219l.02-.436c0-2.569-2.083-4.652-4.653-4.652s-4.652 2.083-4.652 4.652l.02.436c.22-2.365 2.21-4.216 4.632-4.216s4.413 1.851 4.633 4.216z\" fill=\"#fff\"/><defs><linearGradient id=\"A\" x1=\"183.117\" y1=\"29.357\" x2=\"174.914\" y2=\"29.493\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#2983ab\"/><stop offset=\"1\" stop-color=\"#1948ab\"/></linearGradient><linearGradient id=\"B\" x1=\"181.148\" y1=\"31.133\" x2=\"184.153\" y2=\"33.7\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#fff\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#fff\"/></linearGradient></defs></svg>"
const iphone14ProSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"436\" height=\"891\" fill=\"none\" xmlns:v=\"https://vecta.io/nano\"><rect x=\"11.904\" y=\"10.472\" width=\"412\" height=\"871\" rx=\"61.5\" stroke=\"#b6b6b6\" stroke-width=\"19\"/><rect x=\"12.904\" y=\"11.472\" width=\"410\" height=\"869\" rx=\"60.5\" stroke=\"#000\" stroke-width=\"17\"/><rect x=\"154.5\" y=\"31.483\" width=\"123\" height=\"36\" rx=\"18\" fill=\"#000\"/><circle opacity=\".34\" cx=\"174.033\" cy=\"49.483\" r=\"5.62\" fill=\"url(#A)\"/><circle opacity=\".34\" cx=\"176.37\" cy=\"51.681\" r=\"1.283\" fill=\"url(#B)\"/><path opacity=\".2\" fill-rule=\"evenodd\" d=\"M178.666 49.483l.02-.436c0-2.569-2.083-4.652-4.653-4.652s-4.652 2.083-4.652 4.652l.02.436c.22-2.365 2.21-4.217 4.632-4.217s4.413 1.851 4.633 4.216z\" fill=\"#fff\"/><path d=\"M431.284 263.897h2.5a2 2 0 0 1 2 2v98.625a2 2 0 0 1-2 2h-2.5V263.897zM0 328.332a2 2 0 0 1 2-2h2.5v63.996H2a2 2 0 0 1-2-2v-59.996zm0-85a2 2 0 0 1 2-2h2.5v63.996H2a2 2 0 0 1-2-2v-59.996z\" fill=\"#222\"/><path d=\"M0 180.332a2 2 0 0 1 2-2h2.5v32H2a2 2 0 0 1-2-2v-28z\" fill=\"#444\"/><defs><linearGradient id=\"A\" x1=\"176.617\" y1=\"48.621\" x2=\"168.414\" y2=\"48.757\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#2983ab\"/><stop offset=\"1\" stop-color=\"#1948ab\"/></linearGradient><linearGradient id=\"B\" x1=\"174.648\" y1=\"50.397\" x2=\"177.653\" y2=\"52.964\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#fff\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#fff\"/></linearGradient></defs></svg>"
const iphone14ProMaxSvg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"473\" height=\"971\" fill=\"none\" xmlns:v=\"https://vecta.io/nano\"><rect x=\"11.904\" y=\"10.472\" width=\"449\" height=\"951\" rx=\"61.5\" stroke=\"#b6b6b6\" stroke-width=\"19\"/><rect x=\"12.904\" y=\"11.472\" width=\"447\" height=\"949\" rx=\"60.5\" stroke=\"#000\" stroke-width=\"17\"/><rect x=\"172.5\" y=\"31.483\" width=\"128\" height=\"36\" rx=\"18\" fill=\"#000\"/><circle opacity=\".34\" cx=\"192.033\" cy=\"49.483\" r=\"5.62\" fill=\"url(#A)\"/><circle opacity=\".34\" cx=\"194.37\" cy=\"51.681\" r=\"1.283\" fill=\"url(#B)\"/><path opacity=\".2\" fill-rule=\"evenodd\" d=\"M196.666 49.483l.02-.436c0-2.569-2.083-4.652-4.653-4.652s-4.652 2.083-4.652 4.652l.02.436c.22-2.365 2.21-4.217 4.632-4.217s4.413 1.851 4.633 4.216z\" fill=\"#fff\"/><path d=\"M468.284 263.897h2.5a2 2 0 0 1 2 2v98.625a2 2 0 0 1-2 2h-2.5V263.897zM0 328.332a2 2 0 0 1 2-2h2.5v63.996H2a2 2 0 0 1-2-2v-59.996zm0-85a2 2 0 0 1 2-2h2.5v63.996H2a2 2 0 0 1-2-2v-59.996z\" fill=\"#222\"/><path d=\"M0 180.332a2 2 0 0 1 2-2h2.5v32H2a2 2 0 0 1-2-2v-28z\" fill=\"#444\"/><defs><linearGradient id=\"A\" x1=\"194.617\" y1=\"48.621\" x2=\"186.414\" y2=\"48.757\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#2983ab\"/><stop offset=\"1\" stop-color=\"#1948ab\"/></linearGradient><linearGradient id=\"B\" x1=\"192.648\" y1=\"50.397\" x2=\"195.653\" y2=\"52.964\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#fff\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#fff\"/></linearGradient></defs></svg>"

const screenResolutions = {
  iPhone12Pro: {
    width: 390,
    height: 844,
    margin: '20px 0 0 24px',
  },
  iPhone12ProMax: {
    width: 428,
    height: 926,
    margin: '20px 0 0 24px',
  },
  iPhone14Pro: {
    width: 393,
    height: 852,
    margin: '20px 0 0 22px',
  },
  iPhone14ProMax: {
    width: 430,
    height: 932,
    margin: '20px 0 0 22px',
  }
}

function mapToModel(modelName: string) {
  const iPhone12Pro = [
    "iPhone 12",
    "iPhone 12 Pro",
    "iPhone 13",
    "iPhone 13 Pro",
    "iPhone 14"
  ];

  const iPhone12ProMax = [
    "iPhone 12 Pro Max",
    "iPhone 13 Pro Max",
    "iPhone 14 Plus"
  ];

  const iPhone14Pro = [
    "iPhone 14 Pro"
  ];

  const iPhone14ProMax = [
    "iPhone 14 Pro Max"
  ];

  if (iPhone12Pro.includes(modelName)) {
    return { svg: iPhone12ProSvg, styles: screenResolutions.iPhone12Pro };
  } else if (iPhone12ProMax.includes(modelName)) {
    return { svg: iPhone12ProMaxSvg, styles: screenResolutions.iPhone12ProMax };
  } else if (iPhone14Pro.includes(modelName)) {
    return { svg: iphone14ProSvg, styles: screenResolutions.iPhone14Pro };
  } else if (iPhone14ProMax.includes(modelName)) {
    return { svg: iphone14ProMaxSvg, styles: screenResolutions.iPhone14ProMax };
  } else {
    return { svg: iPhone12ProSvg, styles: screenResolutions.iPhone12Pro}; // Default fallback
  }
}

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
      const { svg, styles } = mapToModel(userDevice)
      shell.innerHTML = svg

      videoEl.width = styles.width
      videoEl.height = styles.height
      videoEl.style.margin = styles.margin
      shell.style.position = 'absolute'

      sourceEl.setAttribute('src', videoURL)
      sourceEl.setAttribute('type', 'video/mp4')

      host.appendChild(shell)
      host.appendChild(videoEl)
      videoEl.appendChild(sourceEl)

      videoRef.current = videoEl
      playerContext.player.injectPlayer(host)
      playerContext.player.customScale(438, 883)
    }
  }, [videoURL, playerContext.player.screen.document])
  return (
    <div />
  )
}

export default observer(ReplayWindow);
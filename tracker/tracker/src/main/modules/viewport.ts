import type App from '../app/index.js'
import { getTimeOrigin } from '../utils.js'
import { SetPageLocation, SetViewportSize, SetPageVisibility } from '../app/messages.gen.js'
import { stringWiper } from '../app/sanitizer.js'

export default function (app: App): void {
  let url: string | null, width: number, height: number
  let navigationStart: number
  let referrer = document.referrer

  const sendSetPageLocation = app.safe(() => {
    const { URL } = document
    if (URL !== url) {
      url = URL
      const safeTitle = app.sanitizer.privateMode ? stringWiper(document.title) : document.title
      const safeUrl = app.sanitizer.privateMode ? stringWiper(url) : url
      const safeReferrer = app.sanitizer.privateMode ? stringWiper(referrer) : referrer
      app.send(SetPageLocation(safeUrl, safeReferrer, navigationStart, safeTitle))
      navigationStart = 0
      referrer = url
    }
  })

  const sendSetViewportSize = app.safe(() => {
    const { innerWidth, innerHeight } = window
    if (innerWidth !== width || innerHeight !== height) {
      width = innerWidth
      height = innerHeight
      app.send(SetViewportSize(width, height))
    }
  })

  const sendSetPageVisibility =
    document.hidden === undefined
      ? Function.prototype
      : app.safe(() => app.send(SetPageVisibility(document.hidden)))

  app.attachStartCallback(() => {
    url = null
    navigationStart = getTimeOrigin()
    width = height = -1
    sendSetPageLocation()
    sendSetViewportSize()
    sendSetPageVisibility()
  })

  if (document.hidden !== undefined) {
    app.attachEventListener(
      document,
      'visibilitychange',
      sendSetPageVisibility as EventListener,
      false,
      false,
    )
  }

  app.ticker.attach(sendSetPageLocation, 1, false)
  app.ticker.attach(sendSetViewportSize, 5, false)
}

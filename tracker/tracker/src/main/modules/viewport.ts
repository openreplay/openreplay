import type App from '../app/index.js'
import { getTimeOrigin } from '../utils.js'
import { SetPageLocation, SetViewportSize, SetPageVisibility } from '../app/messages.gen.js'
import { stringWiper } from '../app/sanitizer.js'

export interface Options {
  urlSanitizer?: (url: string) => string
  titleSanitizer?: (title: string) => string
  /** if present, tracker will remove given symbol to present url as regular router url on replay level;
   *
   * applied BEFORE sanitizers.
   *
   * @example passing '#/' will result in 'site.com/#/path' -> 'site.com/path'
   */
  replaceHashSymbol?: string
}

export default function (app: App, options?: Options): void {
  let url: string | null, width: number, height: number
  let navigationStart: number
  let referrer = document.referrer
  const urlSanitizer = options?.urlSanitizer || ((u) => u)
  const titleSanitizer = options?.titleSanitizer || ((t) => t)

  const sendSetPageLocation = app.safe(() => {
    const currURL = document.URL;
    if (currURL !== url) {
      url = currURL
      if (options?.replaceHashSymbol) {
        // replace hash router symbol if needed without affecting pathname of the url
        const u = new URL(currURL);
        const hashRoute = u.hash.startsWith("#/") ? u.hash.slice(2) : "";
        const routePath = hashRoute ? "/" + hashRoute.replace(/^\/+/, "") : "";
        const cleaned = u.origin + u.pathname.replace(/\/$/, "") + routePath + u.search;
        url = cleaned;
      }
      const sanitized = urlSanitizer(url)
      const safeTitle = app.sanitizer.privateMode
        ? stringWiper(document.title)
        : titleSanitizer(document.title)
      const safeUrl = app.sanitizer.privateMode ? stringWiper(sanitized) : sanitized
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

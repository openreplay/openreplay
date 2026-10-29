import type App from '../app/index.js'
import { PageHeight, ScrollDepth } from '../app/messages.gen.js'

export interface Options {
  /** Don't send page scroll depth (it feeds scroll maps). */
  disableScrollmaps: boolean
}

const STEP = 5
// a route often paints a short skeleton first: measured then, staying on top
// would read as having seen the whole page
const SETTLE_MS = 500
const SETTLE_MAX_MS = 5000

const docHeight = () => document.documentElement.scrollHeight

export default function (app: App): void {
  let url = ''
  let sent = -1
  let dirty = false
  let settled = false
  let height = -1
  let pageAt = 0
  let changedAt = 0

  const newPage = () => {
    url = document.URL
    sent = -1
    dirty = settled = false
    height = -1
    pageAt = changedAt = Date.now()
  }

  const sendDepth = () => {
    const h = docHeight()
    if (!h) return
    // ceil: a subpixel scroll position at the very bottom still reads as 100
    const bottom = Math.ceil(window.scrollY + window.innerHeight)
    const step = Math.min(100, Math.floor((bottom * 100) / (h * STEP)) * STEP)
    if (step > sent) {
      sent = step
      app.send(ScrollDepth(step))
    }
  }

  const tick = () => {
    if (document.URL !== url) {
      // wait for the new page's SetPageLocation before sending anything for it
      newPage()
      return
    }
    if (!settled) {
      const now = Date.now()
      if (!dirty && now - pageAt < SETTLE_MAX_MS) {
        if (document.readyState !== 'complete') return
        const h = docHeight()
        if (h !== height) {
          height = h
          changedAt = now
          return
        }
        if (now - changedAt < SETTLE_MS) return
      }
      settled = dirty = true
      app.send(PageHeight(docHeight(), window.innerHeight))
    }
    if (dirty) {
      dirty = false
      sendDepth()
    }
  }

  app.attachStartCallback(newPage)
  app.attachEventListener(
    document,
    'scroll',
    () => {
      dirty = true
    },
    false,
    false,
  )
  // a taller window shows more of the page without a scroll
  app.attachEventListener(
    window,
    'resize',
    () => {
      if (settled) dirty = true
    },
    false,
    false,
  )
  app.ticker.attach(tick, 5)
}

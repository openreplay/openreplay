import type App from '../app/index.js'
import { hasTag } from '../app/guards.js'
import { isURL } from '../utils.js'
import { ResourceTiming, PageLoadTiming, PageRenderTiming } from '../app/messages.gen.js'

// Inspired by https://github.com/WPO-Foundation/RUM-SpeedIndex/blob/master/src/rum-speedindex.js

interface ResourcesTimeMap {
  [k: string]: number
}

interface PaintBlock {
  time: number
  area: number
}

function getPaintBlocks(resources: ResourcesTimeMap): Array<PaintBlock> {
  const paintBlocks: Array<PaintBlock> = []
  const elements = document.getElementsByTagName('*')
  const styleURL = /url\(("[^"]*"|'[^']*'|[^)]*)\)/i
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i]
    let src = ''
    if (hasTag(element, 'IMG')) {
      src = element.currentSrc || element.src
    }
    if (!src) {
      const backgroundImage = getComputedStyle(element).getPropertyValue('background-image')
      if (backgroundImage) {
        const matches = styleURL.exec(backgroundImage)
        if (matches !== null) {
          src = matches[1]
          if (src.startsWith('"') || src.startsWith("'")) {
            src = src.substr(1, src.length - 2)
          }
        }
      }
    }
    if (!src) continue
    const time = src.substr(0, 10) === 'data:image' ? 0 : resources[src]
    if (time === undefined) continue
    const rect = element.getBoundingClientRect()
    const top = Math.max(rect.top, 0)
    const left = Math.max(rect.left, 0)
    const bottom = Math.min(
      rect.bottom,
      window.innerHeight ||
        (document.documentElement && document.documentElement.clientHeight) ||
        0,
    )
    const right = Math.min(
      rect.right,
      window.innerWidth || (document.documentElement && document.documentElement.clientWidth) || 0,
    )
    if (bottom <= top || right <= left) continue
    const area = (bottom - top) * (right - left)
    paintBlocks.push({ time, area })
  }
  return paintBlocks
}

function calculateSpeedIndex(firstContentfulPaint: number, paintBlocks: Array<PaintBlock>): number {
  let a =
    (Math.max(
      (document.documentElement && document.documentElement.clientWidth) || 0,
      window.innerWidth || 0,
    ) *
      Math.max(
        (document.documentElement && document.documentElement.clientHeight) || 0,
        window.innerHeight || 0,
      )) /
    10
  let s = a * firstContentfulPaint
  for (let i = 0; i < paintBlocks.length; i++) {
    const { time, area } = paintBlocks[i]
    a += area
    s += area * (time > firstContentfulPaint ? time : firstContentfulPaint)
  }
  return a === 0 ? 0 : s / a
}

export interface Options {
  captureResourceTimings: boolean
  capturePageLoadTimings: boolean
  capturePageRenderTimings: boolean
}

export default function (app: App, opts: Partial<Options>): void {
  const options: Options = Object.assign(
    {
      captureResourceTimings: true,
      capturePageLoadTimings: true,
      capturePageRenderTimings: true,
    },
    opts,
  )
  if (!('PerformanceObserver' in window)) {
    options.captureResourceTimings = false
  }
  if (!options.captureResourceTimings) {
    return
  } // Resources are necessary for all timings

  let resources: ResourcesTimeMap | null = {}

  function resourceTiming(entry: PerformanceResourceTiming): void {
    if (entry.duration < 0 || !isURL(entry.name) || app.isServiceURL(entry.name)) return
    if (resources !== null) {
      resources[entry.name] = entry.startTime + entry.duration
    }
    app.send(
      ResourceTiming(
        entry.startTime + performance.timing.navigationStart,
        entry.duration,
        entry.responseStart && entry.startTime ? entry.responseStart - entry.startTime : 0,
        entry.transferSize > entry.encodedBodySize ? entry.transferSize - entry.encodedBodySize : 0,
        entry.encodedBodySize || 0,
        entry.decodedBodySize || 0,
        entry.name,
        entry.initiatorType,
      ),
    )
  }

  const observer: PerformanceObserver = new PerformanceObserver((list) =>
    list.getEntries().forEach(resourceTiming),
  )

  let prevSessionID: string | undefined
  app.attachStartCallback(function ({ sessionID }) {
    if (sessionID !== prevSessionID) {
      // Send past page resources on a newly started session
      performance.getEntriesByType('resource').forEach(resourceTiming)
      prevSessionID = sessionID
    }
    observer.observe({ entryTypes: ['resource'] })
  })

  app.attachStopCallback(function () {
    observer.disconnect()
  })

  let firstPaint = 0,
    firstContentfulPaint = 0

  if (options.capturePageLoadTimings) {
    let pageLoadTimingSent = false
    app.ticker.attach(() => {
      if (pageLoadTimingSent) {
        return
      }
      if (firstPaint === 0 || firstContentfulPaint === 0) {
        performance.getEntriesByType('paint').forEach((entry: PerformanceEntry) => {
          const { name, startTime } = entry
          switch (name) {
            case 'first-paint':
              firstPaint = startTime
              break
            case 'first-contentful-paint':
              firstContentfulPaint = startTime
              break
          }
        })
      }
      if (performance.timing.loadEventEnd || performance.now() > 30000) {
        pageLoadTimingSent = true
        const {
          navigationStart,
          requestStart,
          responseStart,
          responseEnd,
          domContentLoadedEventStart,
          domContentLoadedEventEnd,
          loadEventStart,
          loadEventEnd,
        } = performance.timing
        app.send(
          PageLoadTiming(
            requestStart - navigationStart || 0,
            responseStart - navigationStart || 0,
            responseEnd - navigationStart || 0,
            domContentLoadedEventStart - navigationStart || 0,
            domContentLoadedEventEnd - navigationStart || 0,
            loadEventStart - navigationStart || 0,
            loadEventEnd - navigationStart || 0,
            firstPaint,
            firstContentfulPaint,
          ),
        )
      }
    }, 30)
  }

  if (options.capturePageRenderTimings) {
    let visuallyComplete = 0,
      interactiveWindowStartTime = 0,
      interactiveWindowTickTime: number | null = 0,
      paintBlocks: Array<PaintBlock> | null = null

    let pageRenderTimingSent = false
    app.ticker.attach(() => {
      if (pageRenderTimingSent) {
        return
      }
      const time = performance.now()
      if (resources !== null) {
        visuallyComplete = Math.max.apply(
          null,
          Object.keys(resources).map((k) => (resources as any)[k]),
        )
        if (time - visuallyComplete > 1000) {
          paintBlocks = getPaintBlocks(resources)
          resources = null
        }
      }
      if (interactiveWindowTickTime !== null) {
        if (time - interactiveWindowTickTime > 50) {
          interactiveWindowStartTime = time
        }
        interactiveWindowTickTime = time - interactiveWindowStartTime > 5000 ? null : time
      }
      if ((paintBlocks !== null && interactiveWindowTickTime === null) || time > 30000) {
        pageRenderTimingSent = true
        resources = null
        const speedIndex =
          paintBlocks === null
            ? 0
            : calculateSpeedIndex(firstContentfulPaint || firstPaint, paintBlocks)
        const timeToInteractive =
          interactiveWindowTickTime === null
            ? Math.max(
                interactiveWindowStartTime,
                firstContentfulPaint,
                performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart ||
                  0,
              )
            : 0
        app.send(
          PageRenderTiming(
            speedIndex,
            firstContentfulPaint > visuallyComplete ? firstContentfulPaint : visuallyComplete,
            timeToInteractive,
          ),
        )
      }
    })
  }
}

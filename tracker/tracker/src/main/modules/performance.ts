import type App from '../app/index.js'
import { IN_BROWSER } from '../utils.js'
import { PerformanceTrack } from '../app/messages.gen.js'

type Perf = {
  memory: {
    totalJSHeapSize?: number
    usedJSHeapSize?: number
    jsHeapSizeLimit?: number
  }
}

const perf: Perf =
  IN_BROWSER && 'performance' in window && 'memory' in performance // works in Chrome only
    ? (performance as any)
    : { memory: {} }

export const deviceMemory = IN_BROWSER ? ((navigator as any).deviceMemory || 0) * 1024 : 0
export const jsHeapSizeLimit = perf.memory.jsHeapSizeLimit || 0

export interface Options {
  capturePerformance: boolean
}

const PAUSED = -1

export default function (app: App, opts: Partial<Options>): void {
  const options: Options = Object.assign(
    {
      capturePerformance: true,
    },
    opts,
  )
  if (!options.capturePerformance) {
    return
  }

  // Capture references up front so a third party that later replaces the global
  // (Sentry's browserApiErrors, polyfills, zones, ...) can't change which
  // implementation we drive the loop with mid-session.
  const raf =
    IN_BROWSER && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : null
  const caf =
    IN_BROWSER && typeof window.cancelAnimationFrame === 'function'
      ? window.cancelAnimationFrame.bind(window)
      : null

  let running = false
  let frames = 0
  let ticks = 0
  let rafHandle: number | null = null
  let inFrame = false

  const onFrame = (): void => {
    rafHandle = null
    if (!running || frames === PAUSED) {
      return
    }
    frames++
    if (inFrame) {
      return
    }
    scheduleFrame()
  }

  const scheduleFrame = (): void => {
    if (!raf || rafHandle !== null) {
      return
    }
    inFrame = true
    rafHandle = raf(onFrame)
    inFrame = false
  }

  const stopLoop = (): void => {
    if (rafHandle !== null && caf) {
      caf(rafHandle)
    }
    rafHandle = null
  }

  app.ticker.attach(
    (): void => {
      if (!running || ticks === PAUSED) {
        return
      }
      ticks++
    },
    0,
    false,
  )

  const sendPerformanceTrack = (): void => {
    if (!running) {
      return
    }
    app.send(
      PerformanceTrack(
        frames,
        ticks,
        perf.memory.totalJSHeapSize || 0,
        perf.memory.usedJSHeapSize || 0,
      ),
    )
    if (document.hidden) {
      frames = ticks = PAUSED
    } else {
      frames = ticks = 0
      scheduleFrame()
    }
  }

  app.attachStartCallback((): void => {
    running = true
    frames = ticks = PAUSED
    sendPerformanceTrack()
  })

  app.attachStopCallback((): void => {
    running = false
    frames = ticks = 0
    stopLoop()
  })

  app.ticker.attach(sendPerformanceTrack, 165, false)

  if (document.hidden !== undefined) {
    app.attachEventListener(
      document,
      'visibilitychange',
      sendPerformanceTrack as EventListener,
      false,
      false,
    )
  }
}

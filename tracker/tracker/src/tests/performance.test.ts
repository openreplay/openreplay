import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'
import setupPerformance from '../main/modules/performance.js'
import * as TrackerMessages from '../main/app/messages.gen.js'

type TickerCb = () => void

class MockApp {
  send = jest.fn()

  tickerCallbacks: TickerCb[] = []
  ticker = {
    attach: (cb: TickerCb) => {
      this.tickerCallbacks.push(cb)
    },
  }

  startCallbacks: Array<() => void> = []
  stopCallbacks: Array<() => void> = []
  attachStartCallback = (cb: () => void) => {
    this.startCallbacks.push(cb)
  }
  attachStopCallback = (cb: () => void) => {
    this.stopCallbacks.push(cb)
  }

  eventListeners: Record<string, EventListener> = {}
  attachEventListener = (_target: any, type: string, listener: EventListener) => {
    this.eventListeners[type] = listener
  }

  // helpers
  start() {
    this.startCallbacks.forEach((cb) => cb())
  }
  stop() {
    this.stopCallbacks.forEach((cb) => cb())
  }
  fireVisibilityChange() {
    this.eventListeners['visibilitychange']?.(new Event('visibilitychange'))
  }
}

function setHidden(value: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => value,
  })
}

describe('Performance plugin', () => {
  let app: MockApp
  const realRaf = window.requestAnimationFrame
  const realCaf = window.cancelAnimationFrame

  beforeEach(() => {
    jest.clearAllMocks()
    app = new MockApp()
    setHidden(false)
  })

  afterEach(() => {
    window.requestAnimationFrame = realRaf
    window.cancelAnimationFrame = realCaf
  })

  test('a synchronous requestAnimationFrame does not recurse into a hang', () => {
    // Reproduces the reported freeze: a rAF implementation that invokes its
    // callback synchronously would, without a guard, recurse forever.
    let calls = 0
    window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      calls++
      cb(0) // fire synchronously
      return calls
    }) as any
    window.cancelAnimationFrame = jest.fn()

    setupPerformance(app as any, {})

    expect(() => app.start()).not.toThrow()
    // The re-entrancy guard stops the loop after one synchronous frame instead of recursing.
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  test('a synchronous requestAnimationFrame still reschedules on the next sample', () => {
    window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      cb(0)
      return 7
    }) as any
    window.cancelAnimationFrame = jest.fn()
    const spy = jest.spyOn(TrackerMessages, 'PerformanceTrack')

    setupPerformance(app as any, {})
    app.start()
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)

    // sample ticker: the frame loop must be re-armed, not blocked by a stale handle
    const sample = app.tickerCallbacks[1]
    sample()
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2)
    sample()
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(3)
    // each sample counted the synchronous frame of the previous schedule
    expect(spy.mock.calls[2][0]).toBe(1)
    spy.mockRestore()
  })

  test('keeps a single in-flight frame even if start fires twice', () => {
    const queue: FrameRequestCallback[] = []
    window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      queue.push(cb)
      return queue.length
    }) as any
    window.cancelAnimationFrame = jest.fn()

    setupPerformance(app as any, {})

    app.start()
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)

    // A second start callback (cold-start cycle, cross-domain iframe, restart...)
    // must not spawn a parallel loop while a frame is already in flight.
    app.start()
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1)

    // Flushing the pending frame schedules exactly one successor.
    expect(queue.length).toBe(1)
    queue.shift()!(0)
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2)
    expect(queue.length).toBe(1)
  })

  test('cancels the in-flight frame on stop and does not reschedule', () => {
    const queue: FrameRequestCallback[] = []
    window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      queue.push(cb)
      return 42
    }) as any
    window.cancelAnimationFrame = jest.fn()

    setupPerformance(app as any, {})
    app.start()

    app.stop()
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42)

    // A stale frame that still fires after stop must be inert.
    const callsBefore = (window.requestAnimationFrame as jest.Mock).mock.calls.length
    queue.shift()?.(0)
    expect((window.requestAnimationFrame as jest.Mock).mock.calls.length).toBe(callsBefore)
  })

  test('resumes the loop when the tab becomes visible again', () => {
    const queue: FrameRequestCallback[] = []
    window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      queue.push(cb)
      return queue.length
    }) as any
    window.cancelAnimationFrame = jest.fn()

    setupPerformance(app as any, {})
    app.start()
    const afterStart = (window.requestAnimationFrame as jest.Mock).mock.calls.length

    // Tab hidden: browser pauses rAF, our pending frame becomes inert.
    setHidden(true)
    app.fireVisibilityChange()
    queue.forEach((cb) => cb(0))
    queue.length = 0
    const afterHidden = (window.requestAnimationFrame as jest.Mock).mock.calls.length
    expect(afterHidden).toBe(afterStart)

    // Tab visible again: loop must restart.
    setHidden(false)
    app.fireVisibilityChange()
    expect((window.requestAnimationFrame as jest.Mock).mock.calls.length).toBeGreaterThan(
      afterHidden,
    )
  })

  test('emits PerformanceTrack samples with counted frames and ticks', () => {
    const queue: FrameRequestCallback[] = []
    window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      queue.push(cb)
      return queue.length
    }) as any
    window.cancelAnimationFrame = jest.fn()
    const spy = jest.spyOn(TrackerMessages, 'PerformanceTrack')

    setupPerformance(app as any, {})
    app.start()
    // first sample on start is the paused marker
    expect(spy).toHaveBeenLastCalledWith(-1, -1, 0, 0)
    expect(app.send).toHaveBeenCalledTimes(1)

    const [tick, sample] = app.tickerCallbacks
    tick()
    tick()
    tick()
    queue.shift()!(0)
    queue.shift()!(0)
    sample()
    expect(spy).toHaveBeenLastCalledWith(2, 3, 0, 0)
    expect(app.send).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  test('sends nothing when stopped or when capturePerformance is false', () => {
    window.requestAnimationFrame = jest.fn(() => 1) as any
    window.cancelAnimationFrame = jest.fn()

    setupPerformance(app as any, { capturePerformance: false })
    expect(app.tickerCallbacks).toHaveLength(0)
    expect(app.startCallbacks).toHaveLength(0)

    setupPerformance(app as any, {})
    app.tickerCallbacks[1]()
    expect(app.send).not.toHaveBeenCalled()
  })
})

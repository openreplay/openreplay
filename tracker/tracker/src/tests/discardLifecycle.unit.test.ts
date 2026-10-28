import { expect, jest, test } from '@jest/globals'
jest.mock('@openreplay/network-proxy', () => ({ __esModule: true, default: jest.fn(() => { throw Error('discard unit must not initialise network proxy') }) }))
import Tracker from '../main/index.js'
import App from '../main/app/index.js'

function recorder() {
  const tracker = Object.create(Tracker.prototype) as any
  const app = { stop: jest.fn(), discard: jest.fn(), forceFlushBatch: jest.fn(), session: { getSessionHash: jest.fn(() => 'synthetic-hash') } }
  tracker.app = app
  return { tracker, app }
}

test('ordinary stop preserves existing flush delegation and hash return', () => {
  const { tracker, app } = recorder()
  expect(tracker.stop()).toBe('synthetic-hash')
  expect(app.stop).toHaveBeenCalledTimes(1)
  expect(app.session.getSessionHash).toHaveBeenCalledTimes(1)
})

test('public discard returns no identity and never calls flushing stop', () => {
  const { tracker, app } = recorder()
  expect(typeof tracker.discard).toBe('function')
  expect(tracker.discard()).toBeUndefined()
  expect(app.discard).toHaveBeenCalledTimes(1)
  expect(app.stop).not.toHaveBeenCalled()
  expect(app.session.getSessionHash).not.toHaveBeenCalled()
})

test('discard invalidates the public recorder before reentrant teardown callbacks', () => {
  const { tracker, app } = recorder()
  tracker.forceFlushBatch()
  expect(app.forceFlushBatch).toHaveBeenCalledTimes(1)
  app.forceFlushBatch.mockClear()
  app.discard.mockImplementation(() => { tracker.forceFlushBatch(); tracker.stop() })
  expect(typeof tracker.discard).toBe('function')
  tracker.discard()
  expect(app.forceFlushBatch).not.toHaveBeenCalled()
  expect(app.stop).not.toHaveBeenCalled()
})

test('discard is terminal/idempotent and later start cannot reuse App', async () => {
  const { tracker, app } = recorder()
  expect(typeof tracker.discard).toBe('function')
  tracker.discard(); tracker.discard()
  expect(app.discard).toHaveBeenCalledTimes(1)
  await expect(tracker.start()).rejects.toBeDefined()
})

test('App has a separate non-flushing terminal discard boundary', () => {
  expect(typeof (App.prototype as any).discard).toBe('function')
})


test('singleton release waits for teardown so reentrant discard cannot expose half-detached globals', () => {
  const { tracker, app } = recorder()
  ;(window as any).__OPENREPLAY__ = tracker
  app.discard.mockImplementation(() => {
    expect((window as any).__OPENREPLAY__).toBe(tracker)
    tracker.discard()
    expect((window as any).__OPENREPLAY__).toBe(tracker)
  })
  try {
    tracker.discard()
    expect((window as any).__OPENREPLAY__).toBeUndefined()
  } finally { delete (window as any).__OPENREPLAY__ }
})

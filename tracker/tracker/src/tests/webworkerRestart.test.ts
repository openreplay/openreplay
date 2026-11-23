import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals'
import { Type } from '../common/messages.gen.js'

const START = {
  type: 'start',
  ingestPoint: 'http://localhost/ingest',
  pageNo: 0,
  timestamp: 0,
  url: 'http://localhost/',
  tabId: 'tab',
  connAttemptCount: 1,
  connAttemptGap: 1,
}

let posted: unknown[]
const send = (data: unknown) => (self as any).onmessage({ data })
const lifecycle = () => posted.filter((m) => m === 'a_stop' || m === 'a_start')
const settle = async () => {
  for (let i = 0; i < 3; i++) await Promise.resolve()
}

describe('worker restart after 30 minutes hidden', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    posted = []
    ;(globalThis as any).postMessage = (m: unknown) => posted.push(m)
    jest.isolateModules(() => {
      require('../webworker/index.js')
    })
    send(START)
    send([[Type.SetPageVisibility, true]])
  })

  afterEach(() => {
    send('stop')
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  test('restarts the tracker once the reset is done', async () => {
    jest.advanceTimersByTime(30 * 60 * 1000)
    jest.advanceTimersByTime(150)
    await settle()
    expect(lifecycle()).toEqual(['a_stop', 'a_start'])
  })

  test('a start during the reset owns the session: no stale a_start', async () => {
    jest.advanceTimersByTime(30 * 60 * 1000)
    send(START)
    jest.advanceTimersByTime(150)
    await settle()
    expect(lifecycle()).toEqual(['a_stop'])
  })
})

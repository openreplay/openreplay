// @ts-nocheck
/**
 * requestIdleCb runs on a module-level FIFO scheduler that every commit goes
 * through. A single task that throws (or returns a rejected promise) used to
 * leave `isRunning` true, so `runTasks()` early-returned forever and no commit
 * ever reached the worker again — the recording ended silently, mid-session,
 * with a clean console because _nCommit swallows the throw into _debug. #4836
 */
import { describe, expect, test, beforeEach, jest } from '@jest/globals'

let requestIdleCb: (cb: () => any) => void
let rafQueue: Array<(t: number) => void>

/** Advance the scheduler: drain microtasks, then run pending animation frames. */
async function tick(times = 8) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve()
    await Promise.resolve()
    const due = rafQueue.splice(0)
    due.forEach((cb) => cb(0))
    await Promise.resolve()
    await Promise.resolve()
  }
}

describe('requestIdleCb task scheduler', () => {
  beforeEach(() => {
    rafQueue = []
    ;(globalThis as any).requestAnimationFrame = (cb: any) => {
      rafQueue.push(cb)
      return rafQueue.length
    }
    // Fresh module registry: the scheduler is a singleton, so state would leak.
    jest.resetModules()
    jest.isolateModules(() => {
      requestIdleCb = require('../main/utils.js').requestIdleCb
    })
  })

  test('runs queued tasks in order', async () => {
    const ran: string[] = []
    requestIdleCb(() => ran.push('a'))
    requestIdleCb(() => ran.push('b'))
    requestIdleCb(() => ran.push('c'))
    await tick()
    expect(ran).toEqual(['a', 'b', 'c'])
  })

  test('a throwing task still surfaces to its caller', async () => {
    // _nCommit relies on this: the first task runs synchronously inside
    // addTask, so its throw lands in _nCommit's own try/catch.
    let caught: unknown = null
    try {
      requestIdleCb(() => {
        throw new Error('DataCloneError')
      })
    } catch (e) {
      caught = e
    }
    expect((caught as Error)?.message).toBe('DataCloneError')
  })

  test('a throwing task does not strand the queue', async () => {
    const ran: string[] = []
    requestIdleCb(() => ran.push('first'))
    await tick(2)

    try {
      requestIdleCb(() => {
        ran.push('boom')
        throw new Error('DataCloneError')
      })
    } catch {
      /* mirrors _nCommit's catch */
    }
    await tick()

    requestIdleCb(() => ran.push('after-1'))
    requestIdleCb(() => ran.push('after-2'))
    await tick()

    expect(ran).toEqual(['first', 'boom', 'after-1', 'after-2'])
  })

  test('a task returning a rejected promise does not strand the queue', async () => {
    const ran: string[] = []
    requestIdleCb(() => ran.push('first'))
    await tick(2)
    requestIdleCb(() => {
      ran.push('rejected')
      return Promise.reject(new Error('boom'))
    })
    await tick()
    requestIdleCb(() => ran.push('after'))
    await tick()

    expect(ran).toEqual(['first', 'rejected', 'after'])
  })

  test('repeated failures keep the queue alive', async () => {
    const ran: number[] = []
    for (let i = 0; i < 6; i++) {
      try {
        requestIdleCb(() => {
          ran.push(i)
          if (i % 2 === 0) throw new Error('every other one fails')
        })
      } catch {
        /* ignore */
      }
      await tick(2)
    }
    expect(ran).toEqual([0, 1, 2, 3, 4, 5])
  })
})

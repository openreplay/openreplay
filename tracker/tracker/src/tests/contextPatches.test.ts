import { expect, jest, test } from '@jest/globals'
import ContextPatches from '../main/app/contextPatches.js'

test('an unloading iframe restores its patch when WeakRef is unavailable', () => {
  const weakRef = Object.getOwnPropertyDescriptor(globalThis, 'WeakRef')!
  Object.defineProperty(globalThis, 'WeakRef', { ...weakRef, value: undefined })
  const frame = document.createElement('iframe')
  document.body.appendChild(frame)
  try {
    const context = frame.contentWindow! as unknown as typeof globalThis
    const patches = new ContextPatches()
    const restore = jest.fn()
    patches.set(context, restore)
    context.dispatchEvent(new Event('unload'))

    expect(restore).toHaveBeenCalledTimes(1)
    expect(patches.has(context)).toBe(false)
    const restoreNext = jest.fn()
    patches.set(context, restoreNext)
    patches.clear()
    expect(restoreNext).toHaveBeenCalledTimes(1)
    expect(restore).toHaveBeenCalledTimes(1)
  } finally {
    frame.remove()
    Object.defineProperty(globalThis, 'WeakRef', weakRef)
  }
})

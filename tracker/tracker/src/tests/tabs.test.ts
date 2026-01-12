import tabs from '../main/modules/tabs'
import { TabChange } from '../main/app/messages.gen.js'
import { describe, test, expect, jest } from '@jest/globals'

describe('tabs module', () => {
  test('sends TabChange when focused and document visible', () => {
    const app = {
      debug: { log: jest.fn() },
      session: { getTabId: jest.fn().mockReturnValue('tab1') },
      send: jest.fn(),
      attachEventListener: jest.fn(),
      attachStartCallback: jest.fn(),
    }
    // @ts-ignore
    tabs(app)
    expect(app.attachEventListener).toHaveBeenCalledWith(
      window,
      'focus',
      expect.any(Function),
      false,
      false,
    )
    const cb = (app.attachEventListener as jest.Mock).mock.calls[0][2] as () => void
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    cb()
    expect(app.send).toHaveBeenCalledWith(TabChange('tab1'))
  })

  test('does not send TabChange when document hidden', () => {
    const app = {
      debug: { log: jest.fn() },
      session: { getTabId: jest.fn().mockReturnValue('tab1') },
      send: jest.fn(),
      attachEventListener: jest.fn(),
      attachStartCallback: jest.fn(),
    }
    // @ts-ignore
    tabs(app)
    const cb = (app.attachEventListener as jest.Mock).mock.calls[0][2] as () => void
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    cb()
    expect(app.send).not.toHaveBeenCalled()
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
  })
})

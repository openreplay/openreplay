import RemoteControl, { RCStatus, } from '../src/RemoteControl'
import ConfirmWindow from '../src/ConfirmWindow/ConfirmWindow'
import { describe, expect, test, jest, beforeEach, afterEach, } from '@jest/globals'

describe('RemoteControl', () => {
  let remoteControl
  let options
  let onGrand
  let onBusy
  let onRelease
  let confirmWindowMountMock
  let confirmWindowRemoveMock

  beforeEach(() => {
    options = {
      /* mock options */
    }
    onGrand = jest.fn()
    onRelease = jest.fn()
    onBusy = jest.fn()
    confirmWindowMountMock = jest.fn(() => Promise.resolve(true))
    confirmWindowRemoveMock = jest.fn()

    jest.spyOn(window, 'HTMLInputElement').mockImplementation((): any => ({
      value: '',
      dispatchEvent: jest.fn(),
    }))

    jest.spyOn(window, 'HTMLTextAreaElement').mockImplementation((): any => ({
      value: '',
      dispatchEvent: jest.fn(),
    }))

    jest
      .spyOn(ConfirmWindow.prototype, 'mount')
      .mockImplementation(confirmWindowMountMock)
    jest
      .spyOn(ConfirmWindow.prototype, 'remove')
      .mockImplementation(confirmWindowRemoveMock)

    remoteControl = new RemoteControl(options, onGrand, onRelease, onBusy)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should initialize with disabled status', () => {
    expect(remoteControl.status).toBe(RCStatus.Disabled)
    expect(remoteControl.agentID).toBeNull()
    expect(remoteControl.confirm).toBeNull()
    expect(remoteControl.mouse).toBeNull()
  })

  test('should request control when calling requestControl method', () => {
    const id = 'agent123'
    remoteControl.requestControl(id)

    expect(remoteControl.agentID).toBe(id)
    expect(remoteControl.status).toBe(RCStatus.Requesting)
    expect(confirmWindowMountMock).toHaveBeenCalled()
  })

  test('should grant control when calling grantControl method', () => {
    const id = 'agent123'
    remoteControl.grantControl(id)

    expect(remoteControl.agentID).toBe(id)
    expect(remoteControl.status).toBe(RCStatus.Enabled)
    expect(onGrand).toHaveBeenCalledWith(id)
    expect(remoteControl.mouse).toBeDefined()
  })

  test('should release control when calling releaseControl method', () => {
    const isDenied = true
    remoteControl['confirm'] = { remove: jest.fn(), } as unknown as ConfirmWindow
    const confirmSpy = jest.spyOn(remoteControl['confirm'], 'remove')

    remoteControl.releaseControl(isDenied)
    expect(remoteControl.agentID).toBeNull()
    expect(remoteControl.status).toBe(RCStatus.Disabled)
    expect(onRelease).toHaveBeenCalledWith(null, isDenied)
    expect(confirmSpy).toHaveBeenCalled()
    expect(remoteControl.mouse).toBeNull()
  })

  test('should reset mouse when calling resetMouse method', () => {
    remoteControl.resetMouse()

    expect(remoteControl.mouse).toBeNull()
  })

  test('should call mouse.scroll when calling scroll method with correct agentID', () => {
    const id = 'agent123'
    const d = 10
    remoteControl.agentID = id
    remoteControl.mouse = {
      scroll: jest.fn(),
    }

    remoteControl.scroll(id, d)

    expect(remoteControl.mouse.scroll).toHaveBeenCalledWith(d)
  })

  test('should not call mouse.scroll when calling scroll method with incorrect agentID', () => {
    const id = 'agent123'
    const d = 10
    remoteControl.agentID = 'anotherAgent'
    remoteControl.mouse = {
      scroll: jest.fn(),
    }

    remoteControl.scroll(id, d)

    expect(remoteControl.mouse.scroll).not.toHaveBeenCalled()
  })

  test('should call mouse.move when calling move method with correct agentID', () => {
    const id = 'agent123'
    const xy = { x: 10, y: 20, }
    remoteControl.agentID = id
    remoteControl.mouse = {
      move: jest.fn(),
    }

    remoteControl.move(id, xy)

    expect(remoteControl.mouse.move).toHaveBeenCalledWith(xy)
  })

  test('should not call mouse.move when calling move method with incorrect agentID', () => {
    const id = 'agent123'
    const xy = { x: 10, y: 20, }
    remoteControl.agentID = 'anotherAgent'
    remoteControl.mouse = {
      move: jest.fn(),
    }

    remoteControl.move(id, xy)

    expect(remoteControl.mouse.move).not.toHaveBeenCalled()
  })

  test('should call mouse.click when calling click method with correct agentID', () => {
    const id = 'agent123'
    const xy = { x: 10, y: 20, }
    remoteControl.agentID = id
    remoteControl.mouse = {
      click: jest.fn(),
    }

    remoteControl.click(id, xy)

    expect(remoteControl.mouse.click).toHaveBeenCalledWith(xy)
  })

  test('should not call mouse.click when calling click method with incorrect agentID', () => {
    const id = 'agent123'
    const xy = { x: 10, y: 20, }
    remoteControl.agentID = 'anotherAgent'
    remoteControl.mouse = {
      click: jest.fn(),
    }

    remoteControl.click(id, xy)

    expect(remoteControl.mouse.click).not.toHaveBeenCalled()
  })

  test('should set the focused element when calling focus method', () => {
    const id = 'agent123'
    const element = document.createElement('div')

    remoteControl.focus(id, element)

    expect(remoteControl.focused).toBe(element)
  })

  test('should call setInputValue and dispatch input event when calling input method with HTMLInputElement', () => {
    const id = 'agent1234'
    const value = 'test_test'
    const element = document.createElement('input')
    const dispatchSpy = jest.spyOn(element, 'dispatchEvent')
    remoteControl.agentID = id
    remoteControl.mouse = true
    remoteControl.focused = element

    remoteControl.input(id, value)

    expect(element.value).toBe(value)
    expect(dispatchSpy).toHaveBeenCalledWith(
      new Event('input', { bubbles: true, })
    )
  })

  test('should update innerText when calling input method with content editable element', () => {
    const id = 'agent123'
    const value = 'test'
    const element = document.createElement('div')
    //  @ts-ignore
    element['isContentEditable'] = true
    remoteControl.agentID = id
    remoteControl.mouse = true
    remoteControl.focused = element

    remoteControl.input(id, value)
    expect(element.innerText).toBe(value)
  })
})

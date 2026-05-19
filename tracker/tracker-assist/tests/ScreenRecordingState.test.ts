import ScreenRecordingState from '../src/ScreenRecordingState'
import ConfirmWindow from '../src/ConfirmWindow/ConfirmWindow'
import { describe, expect, test, jest, beforeEach, afterEach, } from '@jest/globals'

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('ScreenRecordingState', () => {
  let mountSpy: jest.SpiedFunction<typeof ConfirmWindow.prototype.mount>
  let removeSpy: jest.SpiedFunction<typeof ConfirmWindow.prototype.remove>

  beforeEach(() => {
    mountSpy = jest.spyOn(ConfirmWindow.prototype, 'mount')
    removeSpy = jest.spyOn(ConfirmWindow.prototype, 'remove').mockImplementation(() => {})
    document.body.innerHTML = ''
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('starts inactive', () => {
    const state = new ScreenRecordingState({})
    expect(state.isActive).toBe(false)
  })

  test('accept flow: status becomes active, overlay is added, onAccept fires', async () => {
    mountSpy.mockResolvedValueOnce(true)
    const state = new ScreenRecordingState({})
    const onAccept = jest.fn()
    const onDeny = jest.fn()

    state.requestRecording('agent1', onAccept, onDeny)
    await flush()

    expect(state.isActive).toBe(true)
    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onDeny).not.toHaveBeenCalled()
    expect(document.querySelector('.or-recording-border')).not.toBeNull()
  })

  test('reject flow: status stays inactive, onDeny fires, no overlay', async () => {
    mountSpy.mockResolvedValueOnce(false)
    const state = new ScreenRecordingState({})
    const onAccept = jest.fn()
    const onDeny = jest.fn()

    state.requestRecording('agent1', onAccept, onDeny)
    await flush()

    expect(state.isActive).toBe(false)
    expect(onAccept).not.toHaveBeenCalled()
    expect(onDeny).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.or-recording-border')).toBeNull()
  })

  test('requestRecording is a no-op while a recording is already active', async () => {
    mountSpy.mockResolvedValueOnce(true)
    const state = new ScreenRecordingState({})
    state.requestRecording('agent1', jest.fn(), jest.fn())
    await flush()

    const onAccept = jest.fn()
    const onDeny = jest.fn()
    state.requestRecording('agent2', onAccept, onDeny)
    await flush()

    expect(mountSpy).toHaveBeenCalledTimes(1)
    expect(onAccept).not.toHaveBeenCalled()
    expect(onDeny).not.toHaveBeenCalled()
  })

  test('stopAgentRecording stops only when the id matches the recording agent', async () => {
    mountSpy.mockResolvedValueOnce(true)
    const state = new ScreenRecordingState({})
    state.requestRecording('agent1', jest.fn(), jest.fn())
    await flush()
    expect(state.isActive).toBe(true)

    state.stopAgentRecording('different-agent')
    expect(state.isActive).toBe(true)

    state.stopAgentRecording('agent1')
    expect(state.isActive).toBe(false)
    expect(document.querySelector('.or-recording-border')).toBeNull()
  })

  test('stopRecording always stops an active recording', async () => {
    mountSpy.mockResolvedValueOnce(true)
    const state = new ScreenRecordingState({})
    state.requestRecording('agent1', jest.fn(), jest.fn())
    await flush()

    state.stopRecording()
    expect(state.isActive).toBe(false)
    expect(document.querySelector('.or-recording-border')).toBeNull()
  })
})

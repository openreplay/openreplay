import { describe, expect, test, jest, beforeEach, afterEach, } from '@jest/globals'

jest.mock('@openreplay/tracker', () => ({ App: jest.fn(), }))
jest.mock('socket.io-client', () => ({ connect: jest.fn(), }))
jest.mock('fflate', () => ({ gzip: jest.fn(), }))

import { connect } from 'socket.io-client'
import Assist from '../src/Assist'

const SS_CONFIRM_KEY = '__openreplay_session_confirm'

const makeApp = () => ({
  options: { assistSocketHost: undefined, },
  session: { attachUpdateCallback: jest.fn(), },
  attachEventListener: jest.fn(),
  attachStartCallback: jest.fn(),
  attachStopCallback: jest.fn(),
  attachCommitCallback: jest.fn(),
  debug: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), },
})

const makePeer = () => ({ close: jest.fn(), }) as unknown as RTCPeerConnection

describe('Assist — peer connection cleanup', () => {
  let assist: any
  let app: ReturnType<typeof makeApp>

  beforeEach(() => {
    app = makeApp()
    assist = new Assist(app as any, {})
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('clean() closes every peer in the calls Map', () => {
    const pcA = makePeer()
    const pcB = makePeer()
    assist.calls.set('agent-A', pcA)
    assist.calls.set('agent-B', pcB)

    assist.clean()

    expect(pcA.close).toHaveBeenCalledTimes(1)
    expect(pcB.close).toHaveBeenCalledTimes(1)
    expect(assist.calls.size).toBe(0)
  })

  test('clean() closes every peer in the canvasPeers Map and empties it', () => {
    const pcA = makePeer()
    const pcB = makePeer()
    assist.canvasPeers.set('peerA-1-canvas-7', pcA)
    assist.canvasPeers.set('peerB-2-canvas-8', pcB)

    assist.clean()

    expect(pcA.close).toHaveBeenCalledTimes(1)
    expect(pcB.close).toHaveBeenCalledTimes(1)
    expect(assist.canvasPeers.size).toBe(0)
  })

  test('clean() clears canvasNodeCheckers intervals', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    assist.canvasNodeCheckers.set(1, 111)
    assist.canvasNodeCheckers.set(2, 222)

    assist.clean()

    expect(clearIntervalSpy).toHaveBeenCalledWith(111)
    expect(clearIntervalSpy).toHaveBeenCalledWith(222)
    expect(assist.canvasNodeCheckers.size).toBe(0)
    clearIntervalSpy.mockRestore()
  })

  test('cleanCanvasConnections() closes canvas peers and emits webrtc_canvas_restart', () => {
    const pc = makePeer()
    assist.canvasPeers.set('peer-1-canvas-9', pc)
    const emit = jest.fn()
    assist.socket = { emit, } as any

    assist.cleanCanvasConnections()

    expect(pc.close).toHaveBeenCalledTimes(1)
    expect(assist.canvasPeers.size).toBe(0)
    expect(emit).toHaveBeenCalledWith('webrtc_canvas_restart')
  })

  test('cleanCanvasConnections() is a no-op on emit when socket is null', () => {
    const pc = makePeer()
    assist.canvasPeers.set('peer-1-canvas-9', pc)
    assist.socket = null

    expect(() => assist.cleanCanvasConnections()).not.toThrow()
    expect(pc.close).toHaveBeenCalledTimes(1)
  })
})

describe('Assist — stopCanvasStream', () => {
  let assist: any
  let app: ReturnType<typeof makeApp>

  const agentInfo = (peerId: string, id: number) => ({
    config: '', email: '', id, name: '', peerId, query: '',
  })

  beforeEach(() => {
    app = makeApp()
    assist = new Assist(app as any, {})
    assist.socket = { emit: jest.fn(), } as any
  })

  test('removes only the matching canvas peer and emits stop for it', () => {
    assist.agents = {
      a1: { agentInfo: agentInfo('peerA', 1), },
      a2: { agentInfo: agentInfo('peerB', 2), },
    }
    const pcA = makePeer()
    const pcB = makePeer()
    const pcOther = makePeer()
    assist.canvasPeers.set('peerA-1-canvas-5', pcA)
    assist.canvasPeers.set('peerB-2-canvas-5', pcB)
    assist.canvasPeers.set('peerA-1-canvas-99', pcOther)

    assist.stopCanvasStream(5)

    expect(pcA.close).toHaveBeenCalledTimes(1)
    expect(pcB.close).toHaveBeenCalledTimes(1)
    expect(pcOther.close).not.toHaveBeenCalled()
    expect(assist.canvasPeers.has('peerA-1-canvas-5')).toBe(false)
    expect(assist.canvasPeers.has('peerB-2-canvas-5')).toBe(false)
    expect(assist.canvasPeers.has('peerA-1-canvas-99')).toBe(true)
    expect(assist.socket.emit).toHaveBeenCalledWith('webrtc_canvas_stop', { id: 'peerA-1-canvas-5', })
    expect(assist.socket.emit).toHaveBeenCalledWith('webrtc_canvas_stop', { id: 'peerB-2-canvas-5', })
  })

  test('clears canvasMap and canvasNodeCheckers entries for the stopped id exactly once', () => {
    assist.agents = {
      a1: { agentInfo: agentInfo('peerA', 1), },
      a2: { agentInfo: agentInfo('peerB', 2), },
    }
    const canvasStop = jest.fn()
    assist.canvasMap.set(5, { stop: canvasStop, })
    const interval = 12345 as unknown as ReturnType<typeof setInterval>
    assist.canvasNodeCheckers.set(5, interval)
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

    assist.stopCanvasStream(5)

    expect(canvasStop).toHaveBeenCalledTimes(1)
    expect(assist.canvasMap.has(5)).toBe(false)
    expect(clearIntervalSpy).toHaveBeenCalledWith(interval)
    expect(assist.canvasNodeCheckers.has(5)).toBe(false)
    clearIntervalSpy.mockRestore()
  })

  test('continues to the next agent when one is missing agentInfo', () => {
    assist.agents = {
      a1: { agentInfo: undefined, },
      a2: { agentInfo: agentInfo('peerB', 2), },
    }
    const pcB = makePeer()
    assist.canvasPeers.set('peerB-2-canvas-5', pcB)

    assist.stopCanvasStream(5)

    expect(pcB.close).toHaveBeenCalledTimes(1)
    expect(assist.canvasPeers.has('peerB-2-canvas-5')).toBe(false)
  })
})

describe('Assist — requestConfirm gating', () => {
  let assist: any
  let app: any
  let socketEmit: ReturnType<typeof jest.fn>

  const makeAssist = (options: Record<string, any> = {}) => {
    const a: any = new Assist(app as any, { requestConfirm: true, ...options, })
    socketEmit = jest.fn()
    a.socket = { emit: socketEmit, disconnect: jest.fn(), } as any
    a.tabBus = { postMessage: jest.fn(), addEventListener: jest.fn(), } as any
    return a
  }

  beforeEach(() => {
    sessionStorage.clear()
    document.body.innerHTML = ''
    app = { ...makeApp(), getTabId: jest.fn(() => 'tab-1'), }
    jest
      .spyOn(Assist.prototype as any, 'playNotificationSound')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  test('emit() sends normally when requestConfirm is off', () => {
    assist = makeAssist({ requestConfirm: false, })
    assist.emit('messages', [1,])
    expect(socketEmit).toHaveBeenCalledWith('messages', {
      meta: { tabId: 'tab-1', },
      data: [1,],
    })
  })

  test('emit() drops everything while unconfirmed, force bypasses the gate', () => {
    assist = makeAssist()
    assist.emit('messages', [1,])
    assist.emit('UPDATE_SESSION', { active: true, })
    expect(socketEmit).not.toHaveBeenCalled()

    assist.emit('session_confirm_pending', undefined, true)
    expect(socketEmit).toHaveBeenCalledTimes(1)
    expect(socketEmit).toHaveBeenCalledWith('session_confirm_pending', {
      meta: { tabId: 'tab-1', },
      data: undefined,
    })
  })

  test('constructor restores a persisted approval from sessionStorage', () => {
    sessionStorage.setItem(SS_CONFIRM_KEY, '1')
    assist = makeAssist()
    assist.emit('messages', [1,])
    expect(socketEmit).toHaveBeenCalledWith('messages', expect.anything())
  })

  test('stop() revokes the approval', () => {
    sessionStorage.setItem(SS_CONFIRM_KEY, '1')
    assist = makeAssist()
    assist.stop()
    expect(sessionStorage.getItem(SS_CONFIRM_KEY)).toBe(null)
    expect(assist.sessionConfirmed).toBe(false)
  })

  test('answerSessionConfirm(true) confirms, persists, notifies agents and restarts tracking', () => {
    const onSessionConfirmApprove = jest.fn()
    assist = makeAssist({ onSessionConfirmApprove, })
    const restartSpy = jest
      .spyOn(assist, 'restartTracking')
      .mockImplementation(() => {})
    const agentInfo = { id: 1, name: 'Agent', }

    assist.answerSessionConfirm(true, agentInfo)

    expect(assist.sessionConfirmed).toBe(true)
    expect(sessionStorage.getItem(SS_CONFIRM_KEY)).toBe('1')
    expect(socketEmit).toHaveBeenCalledWith('session_confirm_accepted', expect.anything())
    expect(onSessionConfirmApprove).toHaveBeenCalledWith(agentInfo)
    expect(restartSpy).toHaveBeenCalledTimes(1)
    expect(assist.tabBus.postMessage).toHaveBeenCalledWith({
      type: 'assist_state',
      update: 'confirm',
      confirmAnswer: true,
    })
  })

  test('answerSessionConfirm(false) notifies rejection and keeps the gate closed', () => {
    const onSessionConfirmDeny = jest.fn()
    assist = makeAssist({ onSessionConfirmDeny, })
    const restartSpy = jest
      .spyOn(assist, 'restartTracking')
      .mockImplementation(() => {})

    assist.answerSessionConfirm(false, { id: 1, })

    expect(assist.sessionConfirmed).toBe(false)
    expect(sessionStorage.getItem(SS_CONFIRM_KEY)).toBe(null)
    expect(socketEmit).toHaveBeenCalledWith('session_confirm_rejected', expect.anything())
    expect(onSessionConfirmDeny).toHaveBeenCalledWith({ id: 1, })
    expect(restartSpy).not.toHaveBeenCalled()

    assist.emit('messages', [1,])
    expect(socketEmit).not.toHaveBeenCalledWith('messages', expect.anything())
  })

  test('approval from another tab is applied without re-broadcasting', () => {
    assist = makeAssist()
    const restartSpy = jest
      .spyOn(assist, 'restartTracking')
      .mockImplementation(() => {})

    assist.handleTabStateMessage({
      data: { type: 'assist_state', update: 'confirm', confirmAnswer: true, },
    })

    expect(assist.sessionConfirmed).toBe(true)
    expect(socketEmit).toHaveBeenCalledWith('session_confirm_accepted', expect.anything())
    expect(restartSpy).toHaveBeenCalledTimes(1)
    expect(assist.tabBus.postMessage).not.toHaveBeenCalled()
  })

  test('denial from another tab closes the pending popup', () => {
    const onSessionConfirmDeny = jest.fn()
    assist = makeAssist({ onSessionConfirmDeny, })
    const windowRemove = jest.fn()
    assist.sessionConfirmWindow = { remove: windowRemove, }

    assist.handleTabStateMessage({
      data: { type: 'assist_state', update: 'confirm', confirmAnswer: false, },
    })

    expect(windowRemove).toHaveBeenCalledTimes(1)
    expect(assist.sessionConfirmWindow).toBe(null)
    expect(socketEmit).toHaveBeenCalledWith('session_confirm_rejected', expect.anything())
    expect(onSessionConfirmDeny).toHaveBeenCalledWith({})
    expect(assist.sessionConfirmed).toBe(false)
  })

  test('confirm messages from another tab are ignored when requestConfirm is off', () => {
    assist = makeAssist({ requestConfirm: false, })
    const restartSpy = jest
      .spyOn(assist, 'restartTracking')
      .mockImplementation(() => {})

    assist.handleTabStateMessage({
      data: { type: 'assist_state', update: 'confirm', confirmAnswer: true, },
    })

    expect(restartSpy).not.toHaveBeenCalled()
    expect(socketEmit).not.toHaveBeenCalled()
  })
})

describe('Assist — requestConfirm popup flow (socket)', () => {
  let assist: any
  let app: any
  let handlers: Record<string, (...args: any[]) => void>
  let fakeSocket: any

  const agentInfo = {
    config: '', email: 'a@a', id: 1, name: 'Agent', peerId: 'p', query: '',
  }

  const wrapper = () =>
    document.getElementById('openreplay-confirm-window-wrapper')
  const clickConfirm = () =>
    (document.getElementById('openreplay-confirm-window-confirm-btn') as HTMLButtonElement).click()
  const clickDecline = () =>
    (document.getElementById('openreplay-confirm-window-decline-btn') as HTMLButtonElement).click()
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

  const makeSocketApp = () => ({
    ...makeApp(),
    active: jest.fn(() => true),
    getSessionID: jest.fn(() => 'session-1'),
    getProjectKey: jest.fn(() => 'project-1'),
    getTabId: jest.fn(() => 'tab-1'),
    getSessionInfo: jest.fn(() => ({})),
    getHost: jest.fn(() => 'app.local'),
    socketMode: false,
    stop: jest.fn(),
    start: jest.fn(() => Promise.resolve()),
    clearBuffers: jest.fn(),
    // freeze the restart before it reaches timers/app.start
    waitStatus: jest.fn(() => new Promise(() => {})),
    allowAppStart: jest.fn(),
    nodes: { attachNodeCallback: jest.fn(), getID: jest.fn(), getNode: jest.fn(), },
    sanitizer: { isHidden: jest.fn(() => false), },
  })

  const startAssist = (options: Record<string, any> = {}) => {
    assist = new Assist(app as any, { requestConfirm: true, ...options, })
    assist.onStart()
    return assist
  }

  beforeEach(() => {
    sessionStorage.clear()
    document.body.innerHTML = ''
    app = makeSocketApp()
    handlers = {}
    fakeSocket = {
      on: jest.fn((ev: string, cb: any) => { handlers[ev] = cb }),
      onAny: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connect: jest.fn(),
    }
    ;(connect as unknown as jest.Mock).mockReturnValue(fakeSocket)
    jest
      .spyOn(Assist.prototype as any, 'playNotificationSound')
      .mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  test('NEW_AGENT while unconfirmed shows the popup, emits pending state and skips the restart', () => {
    startAssist()

    handlers.NEW_AGENT('agent-1', agentInfo)

    expect(wrapper()).not.toBe(null)
    expect(fakeSocket.emit).toHaveBeenCalledWith('session_confirm_pending', {
      meta: { tabId: 'tab-1', },
      data: undefined,
    })
    expect(app.stop).not.toHaveBeenCalled()

    // a second agent re-emits pending but doesn't duplicate the popup
    handlers.NEW_AGENT('agent-2', agentInfo)
    expect(document.querySelectorAll('#openreplay-confirm-window-wrapper').length).toBe(1)
  })

  test('AGENTS_INFO_CONNECTED while unconfirmed shows the popup too', () => {
    startAssist()

    handlers.AGENTS_INFO_CONNECTED([{ ...agentInfo, socketId: 's-1', },])

    expect(wrapper()).not.toBe(null)
    expect(app.stop).not.toHaveBeenCalled()
  })

  test('approving the popup emits accepted, opens the gate and restarts tracking', async () => {
    const onSessionConfirmApprove = jest.fn()
    startAssist({ onSessionConfirmApprove, })
    handlers.NEW_AGENT('agent-1', agentInfo)

    clickConfirm()
    await flush()

    expect(wrapper()).toBe(null)
    expect(sessionStorage.getItem(SS_CONFIRM_KEY)).toBe('1')
    expect(fakeSocket.emit).toHaveBeenCalledWith('session_confirm_accepted', {
      meta: { tabId: 'tab-1', },
      data: undefined,
    })
    expect(onSessionConfirmApprove).toHaveBeenCalledWith(agentInfo)
    // restart began: full snapshot will be resent to agents
    expect(app.stop).toHaveBeenCalledWith(false)
    expect(app.clearBuffers).toHaveBeenCalledTimes(1)

    assist.emit('messages', [1,])
    expect(fakeSocket.emit).toHaveBeenCalledWith('messages', expect.anything())
  })

  test('declining the popup emits rejected and keeps messages blocked', async () => {
    const onSessionConfirmDeny = jest.fn()
    startAssist({ onSessionConfirmDeny, })
    handlers.NEW_AGENT('agent-1', agentInfo)

    clickDecline()
    await flush()

    expect(wrapper()).toBe(null)
    expect(sessionStorage.getItem(SS_CONFIRM_KEY)).toBe(null)
    expect(fakeSocket.emit).toHaveBeenCalledWith('session_confirm_rejected', {
      meta: { tabId: 'tab-1', },
      data: undefined,
    })
    expect(onSessionConfirmDeny).toHaveBeenCalledWith(agentInfo)
    expect(app.stop).not.toHaveBeenCalled()

    assist.emit('messages', [1,])
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('messages', expect.anything())

    // next agent connection re-prompts
    handlers.NEW_AGENT('agent-2', agentInfo)
    expect(wrapper()).not.toBe(null)
  })

  test('NEW_AGENT without requestConfirm restarts tracking immediately, no popup', () => {
    startAssist({ requestConfirm: false, })

    handlers.NEW_AGENT('agent-1', agentInfo)

    expect(wrapper()).toBe(null)
    expect(app.stop).toHaveBeenCalledWith(false)
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('session_confirm_pending', expect.anything())
  })

  test('NEW_AGENT with a persisted approval skips the popup and restarts', () => {
    sessionStorage.setItem(SS_CONFIRM_KEY, '1')
    startAssist()

    handlers.NEW_AGENT('agent-1', agentInfo)

    expect(wrapper()).toBe(null)
    expect(app.stop).toHaveBeenCalledWith(false)
  })

  test('NO_AGENT removes the pending popup', () => {
    startAssist()
    handlers.NEW_AGENT('agent-1', agentInfo)
    expect(wrapper()).not.toBe(null)

    handlers.NO_AGENT()

    expect(wrapper()).toBe(null)
  })

  test('AGENT_DISCONNECTED of the last agent removes the pending popup', () => {
    startAssist()
    handlers.NEW_AGENT('agent-1', agentInfo)
    expect(wrapper()).not.toBe(null)

    handlers.AGENT_DISCONNECTED('agent-1')

    expect(wrapper()).toBe(null)
  })

  test('a throwing approve callback does not block the restart', async () => {
    startAssist({
      onSessionConfirmApprove: () => { throw new Error('boom') },
    })
    handlers.NEW_AGENT('agent-1', agentInfo)

    clickConfirm()
    await flush()

    expect(fakeSocket.emit).toHaveBeenCalledWith('session_confirm_accepted', expect.anything())
    expect(app.stop).toHaveBeenCalledWith(false)
    expect(app.debug.error).toHaveBeenCalled()
  })

  test('NEW_AGENT during an in-flight restart queues its reconnect instead of dropping it', async () => {
    let finishWait: () => void = () => {}
    app.waitStatus = jest.fn(() => new Promise<void>((resolve) => { finishWait = resolve }))
    startAssist({ requestConfirm: false, })
    const reconnectSpy = jest
      .spyOn(assist.remoteControl, 'reconnect')
      .mockImplementation(() => {})

    handlers.NEW_AGENT('agent-1', agentInfo)
    // stop phase of the first restart: app is no longer active
    app.active.mockReturnValue(false)
    handlers.NEW_AGENT('agent-2', agentInfo)
    expect(app.stop).toHaveBeenCalledTimes(1)

    finishWait()
    await new Promise((resolve) => setTimeout(resolve, 150)) // restart's 100ms delay

    expect(reconnectSpy).toHaveBeenCalledWith(['agent-1',])
    expect(reconnectSpy).toHaveBeenCalledWith(['agent-2',])
  })

  test('pre-approval agent interactions are ignored while unconfirmed', () => {
    startAssist()
    handlers.NEW_AGENT('agent-1', agentInfo)

    handlers.request_control('agent-1', { meta: { tabId: 'tab-1', }, data: 'agent-1', })
    handlers.request_recording('agent-1', { meta: { tabId: 'tab-1', }, data: '{}', })

    // no control/recording confirm popups on top of the session confirm one
    expect(document.querySelectorAll('#openreplay-confirm-window-wrapper').length).toBe(1)
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('recording_busy', expect.anything())
  })
})

import { describe, expect, test, jest, beforeEach, afterEach, } from '@jest/globals'

jest.mock('@openreplay/tracker', () => ({ App: jest.fn(), }))
jest.mock('socket.io-client', () => ({ connect: jest.fn(), }))
jest.mock('fflate', () => ({ gzip: jest.fn(), }))

import { connect } from 'socket.io-client'
import Assist from '../src/Assist'
import { RCStatus } from '../src/RemoteControl'

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

  test('emit() drops replay data while unconfirmed, force bypasses the gate', () => {
    assist = makeAssist()
    assist.emit('messages', [1,])
    assist.emit('messages_gz', new Uint8Array([1,]))
    assist.emit('call_end')
    assist.emit('control_granted', 'agent-1')
    expect(socketEmit).not.toHaveBeenCalled()

    assist.emit('session_confirm_pending', undefined, true)
    expect(socketEmit).toHaveBeenCalledTimes(1)
    expect(socketEmit).toHaveBeenCalledWith('session_confirm_pending', {
      meta: { tabId: 'tab-1', },
      data: undefined,
    })
  })

  test('emit() lets session updates through while unconfirmed', () => {
    assist = makeAssist()
    assist.emit('UPDATE_SESSION', { active: true, })
    expect(socketEmit).toHaveBeenCalledWith('UPDATE_SESSION', {
      meta: { tabId: 'tab-1', },
      data: { active: true, },
    })
  })

  test('session updates from the tracker reach the socket while unconfirmed', () => {
    assist = makeAssist()
    // constructor subscribed to session updates
    const sessionUpdate = app.session.attachUpdateCallback.mock.calls[0][0]
    sessionUpdate({ userID: 'user-1', metadata: { plan: 'pro', }, })
    expect(socketEmit).toHaveBeenCalledWith('UPDATE_SESSION', {
      meta: { tabId: 'tab-1', },
      data: { userID: 'user-1', metadata: { plan: 'pro', }, },
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

  test('a call in another tab is not mirrored while unconfirmed', () => {
    assist = makeAssist()

    assist.handleTabStateMessage({
      data: {
        type: 'assist_state',
        update: 'call',
        isCallActive: true,
        agentIds: ['a1',],
      },
    })
    expect(assist.callUI).toBe(null)

    assist.handleTabStateMessage({
      data: { type: 'assist_state', update: 'rc', rcActive: 'a1', },
    })
    expect(assist.remoteControl?.status).not.toBe(RCStatus.Enabled)
  })

  test('a state check is answered with one message per active topic', () => {
    assist = makeAssist({ requestConfirm: false, })
    assist.tabState = { isCallActive: true, agentIds: ['a1',], rcActive: 'a1', }

    assist.handleTabStateMessage({ data: { type: 'assist_state_check', }, })

    const sent = (assist.tabBus.postMessage as any).mock.calls.map((c: any[]) => c[0])
    expect(sent).toEqual([
      { type: 'assist_state', update: 'call', isCallActive: true, agentIds: ['a1',], },
      { type: 'assist_state', update: 'rc', rcActive: 'a1', },
    ])
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

/** commit callback is gated on agentsConnected, so both announce events must work */
describe('Assist — session reconnect with agents already watching', () => {
  let assist: any
  let app: any
  let handlers: Record<string, (...args: any[]) => void>
  let fakeSocket: any

  const agentInfo = {
    config: '', email: 'a@a', id: 1, name: 'Agent', peerId: 'p', query: '',
  }
  const withSocket = (socketId: string) => ({ ...agentInfo, socketId, })

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
  const wrapper = () => document.getElementById('openreplay-confirm-window-wrapper')

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
    assist = new Assist(app as any, options)
    assist.onStart()
    return assist
  }

  const commit = (messages: any[]) => {
    const cb = (app.attachCommitCallback as any).mock.calls[0][0]
    cb(messages)
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
    jest.useRealTimers()
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  test('nothing is sent while no agent is registered', () => {
    startAssist()

    commit([[1, 2,],])

    expect(fakeSocket.emit).not.toHaveBeenCalledWith('messages', expect.anything())
  })

  test('AGENTS_INFO_CONNECTED registers agents, resends the snapshot and resumes sending', () => {
    startAssist()

    handlers.AGENTS_INFO_CONNECTED([withSocket('s-1'),])

    expect(assist.agents['s-1'].agentInfo).toEqual(withSocket('s-1'))
    expect(app.stop).toHaveBeenCalledWith(false)

    commit([[1, 2,],])
    expect(fakeSocket.emit).toHaveBeenCalledWith('messages', {
      meta: { tabId: 'tab-1', },
      data: [[1, 2,],],
    })
  })

  test('AGENTS_CONNECTED alone is enough on servers that never send agent info', async () => {
    startAssist()

    handlers.AGENTS_CONNECTED(['s-1',])
    await flush()

    expect(Object.keys(assist.agents)).toEqual(['s-1',])
    expect(app.stop).toHaveBeenCalledWith(false)

    commit([[1, 2,],])
    expect(fakeSocket.emit).toHaveBeenCalledWith('messages', {
      meta: { tabId: 'tab-1', },
      data: [[1, 2,],],
    })
  })

  test('both events register each agent once and keep the richer payload', async () => {
    const onAgentConnect = jest.fn()
    startAssist({ onAgentConnect, })

    handlers.AGENTS_CONNECTED(['s-1',])
    handlers.AGENTS_INFO_CONNECTED([withSocket('s-1'),])
    await flush()

    expect(onAgentConnect).toHaveBeenCalledTimes(1)
    expect(onAgentConnect).toHaveBeenCalledWith(withSocket('s-1'))
    expect(assist.agents['s-1'].agentInfo).toEqual(withSocket('s-1'))
    expect(app.stop).toHaveBeenCalledTimes(1)
  })

  test('AGENTS_CONNECTED does not re-announce an agent already known from NEW_AGENT', async () => {
    const onAgentConnect = jest.fn()
    startAssist({ onAgentConnect, })
    handlers.NEW_AGENT('s-1', agentInfo)

    handlers.AGENTS_CONNECTED(['s-1',])
    await flush()

    expect(onAgentConnect).toHaveBeenCalledTimes(1)
    expect(app.stop).toHaveBeenCalledTimes(1)
  })

  test('an empty announcement does not restart tracking', async () => {
    startAssist()

    handlers.AGENTS_CONNECTED([])
    handlers.AGENTS_INFO_CONNECTED([])
    await flush()

    expect(assist.agents).toEqual({})
    expect(app.stop).not.toHaveBeenCalled()
  })

  test('agent info without a socketId is ignored', () => {
    startAssist()

    handlers.AGENTS_INFO_CONNECTED([agentInfo,])

    expect(assist.agents).toEqual({})
    expect(app.stop).not.toHaveBeenCalled()
  })

  test('a reconnect while unconfirmed prompts instead of restarting', async () => {
    startAssist({ requestConfirm: true, })

    handlers.AGENTS_CONNECTED(['s-1',])
    await flush()

    expect(wrapper()).not.toBe(null)
    expect(app.stop).not.toHaveBeenCalled()
    commit([[1, 2,],])
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('messages', expect.anything())
  })
})

describe('Assist — socket refused by the server', () => {
  let assist: any
  let app: any
  let handlers: Record<string, (...args: any[]) => void>
  let fakeSocket: any

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
    waitStatus: jest.fn(() => new Promise(() => {})),
    allowAppStart: jest.fn(),
    nodes: { attachNodeCallback: jest.fn(), getID: jest.fn(), getNode: jest.fn(), },
    sanitizer: { isHidden: jest.fn(() => false), },
  })

  beforeEach(() => {
    jest.useFakeTimers()
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
      connected: false,
    }
    ;(connect as unknown as jest.Mock).mockReturnValue(fakeSocket)
    assist = new Assist(app as any, {})
    assist.onStart()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  test('SESSION_ALREADY_CONNECTED reconnects manually after a backoff', () => {
    handlers.SESSION_ALREADY_CONNECTED()
    expect(fakeSocket.connect).not.toHaveBeenCalled()

    jest.advanceTimersByTime(1000)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1)
  })

  // every retry emits `connect` before the refusal; budget must survive that
  test('the retry backs off and eventually gives up', () => {
    for (let i = 0; i < 8; i++) {
      handlers.connect()
      handlers.SESSION_ALREADY_CONNECTED()
      jest.advanceTimersByTime(10000)
    }
    expect(fakeSocket.connect).toHaveBeenCalledTimes(5)
  })

  test('a refused connection does not refill the retry budget', () => {
    handlers.connect()
    handlers.SESSION_ALREADY_CONNECTED()
    jest.advanceTimersByTime(1000)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1)

    // refused again: still attempt 2, so 2s not 1s
    handlers.connect()
    handlers.SESSION_ALREADY_CONNECTED()
    jest.advanceTimersByTime(1000)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(1000)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(2)
  })

  test('a connection that stays up refills the retry budget', () => {
    handlers.connect()
    handlers.SESSION_ALREADY_CONNECTED()
    jest.advanceTimersByTime(1000)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1)

    // not refused, outlives the stability window
    handlers.connect()
    jest.advanceTimersByTime(10000)

    handlers.SESSION_ALREADY_CONNECTED()
    jest.advanceTimersByTime(1000) // back to the first delay
    expect(fakeSocket.connect).toHaveBeenCalledTimes(2)
  })

  test('a disconnect cancels a pending stability reset', () => {
    handlers.connect()
    handlers.SESSION_ALREADY_CONNECTED()
    jest.advanceTimersByTime(1000)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1)

    // dropped before proving itself, budget stays spent
    handlers.connect()
    handlers.disconnect()
    jest.advanceTimersByTime(10000)

    handlers.connect()
    handlers.SESSION_ALREADY_CONNECTED()
    jest.advanceTimersByTime(1000)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(1000)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(2)
  })

  test('stop() cancels a pending reconnect', () => {
    handlers.SESSION_ALREADY_CONNECTED()
    assist.stop()

    jest.advanceTimersByTime(10000)
    expect(fakeSocket.connect).not.toHaveBeenCalled()
  })
})

describe('Assist — teardown when the last agent leaves', () => {
  let assist: any
  let app: any
  let handlers: Record<string, (...args: any[]) => void>
  let fakeSocket: any

  const agentInfo = {
    config: '', email: 'a@a', id: 1, name: 'Agent', peerId: 'p', query: '',
  }

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
    waitStatus: jest.fn(() => new Promise(() => {})),
    allowAppStart: jest.fn(),
    nodes: { attachNodeCallback: jest.fn(), getID: jest.fn(), getNode: jest.fn(), },
    sanitizer: { isHidden: jest.fn(() => false), },
  })

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
    assist = new Assist(app as any, {})
    assist.onStart()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  test('NO_AGENT releases remote control so the agent cursor does not stay on the page', () => {
    const releaseSpy = jest.spyOn(assist.remoteControl, 'releaseControl')
    handlers.NEW_AGENT('s-1', agentInfo)

    handlers.NO_AGENT()

    expect(releaseSpy).toHaveBeenCalled()
    expect(assist.remoteControl.status).toBe(RCStatus.Disabled)
    expect(assist.agents).toEqual({})
  })

  test('NO_AGENT runs the remote-control cleanup callback of the controlling agent', () => {
    const onControlReleased = jest.fn()
    handlers.NEW_AGENT('s-1', agentInfo)
    assist.agents['s-1'].onControlReleased = onControlReleased
    assist.remoteControl.agentID = 's-1'

    handlers.NO_AGENT()

    expect(onControlReleased).toHaveBeenCalledTimes(1)
  })

  test('releasing control of an agent that is already gone does not throw', () => {
    handlers.NEW_AGENT('s-1', agentInfo)
    assist.remoteControl.agentID = 's-1'

    // NO_AGENT wipes the agents map before RemoteControl hands the id back
    expect(() => handlers.NO_AGENT()).not.toThrow()
    expect(fakeSocket.emit).toHaveBeenCalledWith('control_rejected', {
      meta: { tabId: 'tab-1', },
      data: 's-1',
    })
  })

  test('a throwing app.stop does not wedge every later restart', () => {
    app.stop.mockImplementationOnce(() => { throw new Error('boom') })

    handlers.NEW_AGENT('s-1', agentInfo)
    expect(assist.restartInProgress).toBe(false)
    expect(assist.assistDemandedRestart).toBe(false)

    handlers.NEW_AGENT('s-2', agentInfo)
    expect(app.stop).toHaveBeenCalledTimes(2)
  })
})

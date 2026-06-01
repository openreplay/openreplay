import { describe, expect, test, jest, beforeEach, afterEach, } from '@jest/globals'

jest.mock('@openreplay/tracker', () => ({ App: jest.fn(), }))
jest.mock('socket.io-client', () => ({ connect: jest.fn(), }))
jest.mock('fflate', () => ({ gzip: jest.fn(), }))

import Assist from '../src/Assist'

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

/* eslint-disable @typescript-eslint/no-empty-function */
import type { Socket, } from 'socket.io-client'
import { connect, } from 'socket.io-client'
import Peer, { MediaConnection, } from 'peerjs'
import type { Properties, } from 'csstype'
import { App, } from '@openreplay/tracker'

import RequestLocalStream, { LocalStream, } from './LocalStream.js'
import {hasTag,} from './guards.js'
import RemoteControl, { RCStatus, } from './RemoteControl.js'
import CallWindow from './CallWindow.js'
import AnnotationCanvas from './AnnotationCanvas.js'
import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js'
import { callConfirmDefault, } from './ConfirmWindow/defaults.js'
import type { Options as ConfirmOptions, } from './ConfirmWindow/defaults.js'
import ScreenRecordingState from './ScreenRecordingState.js'
import { pkgVersion, } from './version.js'
import Canvas from './Canvas.js'

// TODO: fully specified strict check with no-any (everywhere)
// @ts-ignore
const safeCastedPeer = Peer.default || Peer

type StartEndCallback = (agentInfo?: Record<string, any>) => ((() => any) | void)

interface AgentInfo {
  email: string;
  id: number
  name: string
  peerId: string
  query: string
}

export interface Options {
  onAgentConnect: StartEndCallback;
  onCallStart: StartEndCallback;
  onRemoteControlStart: StartEndCallback;
  onRecordingRequest?: (agentInfo: Record<string, any>) => any;
  onCallDeny?: () => any;
  onRemoteControlDeny?: (agentInfo: Record<string, any>) => any;
  onRecordingDeny?: (agentInfo: Record<string, any>) => any;
  session_calling_peer_key: string;
  session_control_peer_key: string;
  callConfirm: ConfirmOptions;
  controlConfirm: ConfirmOptions;
  recordingConfirm: ConfirmOptions;
  socketHost?: string;

  // @deprecated
  confirmText?: string;
  // @deprecated
  confirmStyle?: Properties;

  config: RTCConfiguration;
  serverURL: string
  callUITemplate?: string;
}


enum CallingState {
  Requesting,
  True,
  False,
}


// TODO typing????
type OptionalCallback = (()=>Record<string, unknown>) | void
type Agent = {
  onDisconnect?: OptionalCallback,
  onControlReleased?: OptionalCallback,
  agentInfo: AgentInfo | undefined
  //
}


export default class Assist {
  readonly version = pkgVersion

  private socket: Socket | null = null
  private peer: Peer | null = null
  private canvasPeer: Peer | null = null
  private assistDemandedRestart = false
  private callingState: CallingState = CallingState.False
  private remoteControl: RemoteControl | null = null;

  private agents: Record<string, Agent> = {}
  private readonly options: Options
  private readonly canvasMap: Map<number, Canvas> = new Map()

  constructor(
    private readonly app: App,
    options?: Partial<Options>,
    private readonly noSecureMode: boolean = false,
  ) {
    // @ts-ignore
    window.__OR_ASSIST_VERSION = this.version
    this.options = Object.assign({
        session_calling_peer_key: '__openreplay_calling_peer',
        session_control_peer_key: '__openreplay_control_peer',
        config: null,
        serverURL: null,
        onCallStart: ()=>{},
        onAgentConnect: ()=>{},
        onRemoteControlStart: ()=>{},
        callConfirm: {},
        controlConfirm: {}, // TODO: clear options passing/merging/overwriting
        recordingConfirm: {},
        socketHost: '',
      },
      options,
    )

    if (this.app.options.assistSocketHost) {
      this.options.socketHost = this.app.options.assistSocketHost
    }

    if (document.hidden !== undefined) {
      const sendActivityState = (): void => this.emit('UPDATE_SESSION', { active: !document.hidden, })
      app.attachEventListener(
        document,
        'visibilitychange',
        sendActivityState,
        false,
        false,
      )
    }
    const titleNode = document.querySelector('title')
    const observer = titleNode && new MutationObserver(() => {
      this.emit('UPDATE_SESSION', { pageTitle: document.title, })
    })
    app.addOnUxtCb((uxtId: number) => {
      this.emit('UPDATE_SESSION', { uxtId, })
    })
    app.attachStartCallback(() => {
      if (this.assistDemandedRestart) { return }
      this.onStart()
      observer && observer.observe(titleNode, { subtree: true, characterData: true, childList: true, })
    })
    app.attachStopCallback(() => {
      if (this.assistDemandedRestart) { return }
      this.clean()
      observer && observer.disconnect()
    })
    app.attachCommitCallback((messages) => {
      if (this.agentsConnected) {
        // @ts-ignore No need in statistics messages. TODO proper filter
        if (messages.length === 2 && messages[0]._id === 0 &&  messages[1]._id === 49) { return }
        this.emit('messages', messages)
      }
    })
    app.session.attachUpdateCallback(sessInfo => this.emit('UPDATE_SESSION', sessInfo))
  }

  private emit(ev: string, args?: any): void {
    this.socket && this.socket.emit(ev, { meta: { tabId: this.app.getTabId(), }, data: args, })
  }

  private get agentsConnected(): boolean {
    return Object.keys(this.agents).length > 0
  }

  private readonly setCallingState = (newState: CallingState): void => {
    this.callingState = newState
  }
  private getHost():string{
    if (this.options.socketHost) {
      return this.options.socketHost
    }
    if (this.options.serverURL){
      return new URL(this.options.serverURL).host
    }
    return this.app.getHost()
  }
  private getBasePrefixUrl(): string{
    if (this.options.serverURL){
      return new URL(this.options.serverURL).pathname
    }
    return ''
  }

  private onStart() {
    const app = this.app
    const sessionId = app.getSessionID()
    // Common for all incoming call requests
    let callUI: CallWindow | null = null
    let annot: AnnotationCanvas | null = null
    // TODO: encapsulate
    let callConfirmWindow: ConfirmWindow | null = null
    let callConfirmAnswer: Promise<boolean> | null = null
    let callEndCallback: ReturnType<StartEndCallback> | null = null

    if (!sessionId) {
      return app.debug.error('No session ID')
    }
    const peerID = `${app.getProjectKey()}-${sessionId}-${this.app.getTabId()}`

    // SocketIO
    const socket = this.socket = connect(this.getHost(), {
      path: this.getBasePrefixUrl()+'/ws-assist/socket',
      query: {
        'peerId': peerID,
        'identity': 'session',
        'tabId': this.app.getTabId(),
        'sessionInfo': JSON.stringify({
          'uxtId': this.app.getUxtId() ?? undefined,
          pageTitle: document.title,
          active: true,
          ...this.app.getSessionInfo(),
        }),
      },
      transports: ['websocket',],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 25000,
      randomizationFactor: 0.5,
    })
    socket.onAny((...args) => {
      if (args[0] === 'messages' || args[0] === 'UPDATE_SESSION') {
        return
      }
      app.debug.log('Socket:', ...args)
    })

    const onGrand = (id: string) => {
      if (!callUI) {
        callUI = new CallWindow(app.debug.error, this.options.callUITemplate)
      }
      if (this.remoteControl){
        callUI?.showRemoteControl(this.remoteControl.releaseControl)
      }
      this.agents[id] = { ...this.agents[id], onControlReleased: this.options.onRemoteControlStart(this.agents[id]?.agentInfo), }
      this.emit('control_granted', id)
      annot = new AnnotationCanvas()
      annot.mount()
      return callingAgents.get(id)
    }
    const onRelease = (id?: string | null, isDenied?: boolean) => {
      {
        if (id) {
          const cb = this.agents[id].onControlReleased
          delete this.agents[id].onControlReleased
          typeof cb === 'function' && cb()
          this.emit('control_rejected', id)
        }
        if (annot != null) {
          annot.remove()
          annot = null
        }
        callUI?.hideRemoteControl()
        if (this.callingState !== CallingState.True) {
          callUI?.remove()
          callUI = null
        }
        if (isDenied) {
          const info = id ? this.agents[id]?.agentInfo : {}
          this.options.onRemoteControlDeny?.(info || {})
        }
      }
    }

    this.remoteControl = new RemoteControl(
      this.options,
      onGrand,
      (id, isDenied) => onRelease(id, isDenied),
      (id) => this.emit('control_busy', id),
    )

    const onAcceptRecording = () => {
      socket.emit('recording_accepted')
    }
    const onRejectRecording = (agentData: AgentInfo) => {
      socket.emit('recording_rejected')

      this.options.onRecordingDeny?.(agentData || {})
    }
    const recordingState = new ScreenRecordingState(this.options.recordingConfirm)

    function processEvent(agentId: string, event: { meta: { tabId: string }, data?: any }, callback?: (id: string, data: any) => void) {
      if (app.getTabId() === event.meta.tabId) {
        return callback?.(agentId, event.data)
      }
    }
    if (this.remoteControl !== null) {
      socket.on('request_control', (agentId, dataObj) => {
        processEvent(agentId, dataObj, this.remoteControl?.requestControl)
      })
      socket.on('release_control', (agentId, dataObj) => {
        processEvent(agentId, dataObj, (_, data) =>
          this.remoteControl?.releaseControl(data)
        )
      })
      socket.on('scroll', (id, event) => processEvent(id, event, this.remoteControl?.scroll))
      socket.on('click', (id, event) => processEvent(id, event, this.remoteControl?.click))
      socket.on('move', (id, event) => processEvent(id, event, this.remoteControl?.move))
      socket.on('focus', (id, event) => processEvent(id, event, (clientID, nodeID) => {
        const el = app.nodes.getNode(nodeID)
        if (el instanceof HTMLElement && this.remoteControl) {
          this.remoteControl.focus(clientID, el)
        }
      }))
      socket.on('input', (id, event) => processEvent(id, event, this.remoteControl?.input))
    }


    // TODO: restrict by id
    socket.on('moveAnnotation', (id, event) => processEvent(id, event, (_,  d) => annot && annot.move(d)))
    socket.on('startAnnotation', (id, event) => processEvent(id, event, (_,  d) => annot?.start(d)))
    socket.on('stopAnnotation', (id, event) => processEvent(id, event, annot?.stop))

    socket.on('NEW_AGENT', (id: string, info: AgentInfo) => {
      this.agents[id] = {
        onDisconnect: this.options.onAgentConnect?.(info),
        agentInfo: info, // TODO ?
      }
      if (this.app.active()) {
        this.assistDemandedRestart = true
        this.app.stop()
        this.app.clearBuffers()
        setTimeout(() => {
          this.app.start().then(() => { this.assistDemandedRestart = false })
            .then(() => {
              this.remoteControl?.reconnect([id,])
            })
            .catch(e => app.debug.error(e))
          // TODO: check if it's needed; basically allowing some time for the app to finish everything before starting again
        }, 400)
      }
    })
    socket.on('AGENTS_CONNECTED', (ids: string[]) => {
      ids.forEach(id =>{
        const agentInfo = this.agents[id]?.agentInfo
        this.agents[id] = {
          agentInfo,
          onDisconnect: this.options.onAgentConnect?.(agentInfo),
        }
      })
      if (this.app.active()) {
        this.assistDemandedRestart = true
        this.app.stop()
        setTimeout(() => {
          this.app.start().then(() => { this.assistDemandedRestart = false })
            .then(() => {
              this.remoteControl?.reconnect(ids)
            })
            .catch(e => app.debug.error(e))
          // TODO: check if it's needed; basically allowing some time for the app to finish everything before starting again
        }, 400)
      }
    })

    socket.on('AGENT_DISCONNECTED', (id) => {
      this.remoteControl?.releaseControl()

      this.agents[id]?.onDisconnect?.()
      delete this.agents[id]

      recordingState.stopAgentRecording(id)
      endAgentCall(id)
    })
    socket.on('NO_AGENT', () => {
      Object.values(this.agents).forEach(a => a.onDisconnect?.())
      this.agents = {}
      if (recordingState.isActive) recordingState.stopRecording()
    })
    socket.on('call_end', (id) => {
      if (!callingAgents.has(id)) {
        app.debug.warn('Received call_end from unknown agent', id)
        return
      }
      endAgentCall(id)
    })

    socket.on('_agent_name', (id, info) => {
      if (app.getTabId() !== info.meta.tabId) return
      const name = info.data
      callingAgents.set(id, name)
      updateCallerNames()
    })
    socket.on('videofeed', (_, info) => {
      if (app.getTabId() !== info.meta.tabId) return
      const feedState = info.data
      callUI?.toggleVideoStream(feedState)
    })
    socket.on('request_recording', (id, info) => {
      if (app.getTabId() !== info.meta.tabId) return
      const agentData = info.data
      if (!recordingState.isActive) {
        this.options.onRecordingRequest?.(JSON.parse(agentData))
        recordingState.requestRecording(id, onAcceptRecording, () => onRejectRecording(agentData))
      } else {
        this.emit('recording_busy')
      }
    })
    socket.on('stop_recording', (id, info) => {
      if (app.getTabId() !== info.meta.tabId) return
      if (recordingState.isActive) {
        recordingState.stopAgentRecording(id)
      }
    })

    const callingAgents: Map<string, string> = new Map() // !! uses socket.io ID
    // TODO: merge peerId & socket.io id  (simplest way - send peerId with the name)
    const calls: Record<string, MediaConnection> = {} // !! uses peerJS ID
    const lStreams: Record<string, LocalStream> = {}
    // const callingPeers: Map<string, { call: MediaConnection, lStream: LocalStream }> = new Map() // Maybe
    function endAgentCall(id: string) {
      callingAgents.delete(id)
      if (callingAgents.size === 0) {
        handleCallEnd()
      } else {
        updateCallerNames()
        //TODO: close() specific call and corresponding lStreams (after connecting peerId & socket.io id)
      }
    }

    // PeerJS call (todo: use native WebRTC)
    const peerOptions = {
      host: this.getHost(),
      path: this.getBasePrefixUrl()+'/assist',
      port: location.protocol === 'http:' && this.noSecureMode ? 80 : 443,
      debug: 2, //appOptions.__debug_log ? 2 : 0, // 0 Print nothing //1 Prints only errors. / 2 Prints errors and warnings. / 3 Prints all logs.
    }
    if (this.options.config) {
      peerOptions['config'] = this.options.config
    }

    const peer = new safeCastedPeer(peerID, peerOptions) as Peer
    this.peer = peer
    let peerReconnectAttempts = 0
    // @ts-ignore (peerjs typing)
    peer.on('error', e => app.debug.warn('Peer error: ', e.type, e))
    peer.on('disconnected', () => {
      if (peerReconnectAttempts < 30) {
        setTimeout(() => {
          peer.reconnect()
        }, Math.min(peerReconnectAttempts, 8) * 2 * 1000)
        peerReconnectAttempts += 1
      }
    })

    function updateCallerNames() {
      callUI?.setAssistentName(callingAgents)
    }

    const closeCallConfirmWindow = () => {
      if (callConfirmWindow) {
        callConfirmWindow.remove()
        callConfirmWindow = null
        callConfirmAnswer = null
      }
    }
    const requestCallConfirm = () => {
      if (callConfirmAnswer) { // Already asking
        return callConfirmAnswer
      }
      callConfirmWindow = new ConfirmWindow(callConfirmDefault(this.options.callConfirm || {
        text: this.options.confirmText,
        style: this.options.confirmStyle,
      })) // TODO: reuse ?
      return callConfirmAnswer = callConfirmWindow.mount().then(answer => {
        closeCallConfirmWindow()
        return answer
      })
    }

    const handleCallEnd = () => { // Complete stop and clear all calls
      // Streams
      Object.values(calls).forEach(call => call.close())
      Object.keys(calls).forEach(peerId => {
        delete calls[peerId]
      })
      Object.values(lStreams).forEach((stream) => { stream.stop() })
      Object.keys(lStreams).forEach((peerId: string) => { delete lStreams[peerId] })
      // UI
      closeCallConfirmWindow()
      if (this.remoteControl?.status === RCStatus.Disabled) {
        callUI?.remove()
        annot?.remove()
        callUI = null
        annot = null
      } else {
        callUI?.hideControls()
      }

      this.emit('UPDATE_SESSION', { agentIds: [], isCallActive: false, })
      this.setCallingState(CallingState.False)
      sessionStorage.removeItem(this.options.session_calling_peer_key)

      callEndCallback?.()
    }
    const initiateCallEnd = () => {
      this.emit('call_end')
      handleCallEnd()
    }
    const updateVideoFeed = ({ enabled, }) => this.emit('videofeed', { streamId: this.peer?.id, enabled, })

    peer.on('call', (call) => {
      app.debug.log('Incoming call from', call.peer)
      let confirmAnswer: Promise<boolean>
      const callingPeerIds = JSON.parse(sessionStorage.getItem(this.options.session_calling_peer_key) || '[]')
      if (callingPeerIds.includes(call.peer) || this.callingState === CallingState.True) {
        confirmAnswer = Promise.resolve(true)
      } else {
        this.setCallingState(CallingState.Requesting)
        confirmAnswer = requestCallConfirm()
        this.playNotificationSound() // For every new agent during confirmation here

        // TODO: only one (latest) timeout
        setTimeout(() => {
          if (this.callingState !== CallingState.Requesting) { return }
          initiateCallEnd()
        }, 30000)
      }

      confirmAnswer.then(async agreed => {
        if (!agreed) {
          initiateCallEnd()
          this.options.onCallDeny?.()
          return
        }
        // Request local stream for the new connection
        try {
          // lStreams are reusable so fare we don't delete them in the `endAgentCall`
          if (!lStreams[call.peer]) {
            app.debug.log('starting new stream for', call.peer)
            lStreams[call.peer] = await RequestLocalStream()
          }
          calls[call.peer] = call
        } catch (e) {
          app.debug.error('Audio media device request error:', e)
          initiateCallEnd()
          return
        }

        if (!callUI) {
          callUI = new CallWindow(app.debug.error, this.options.callUITemplate)
          callUI.setVideoToggleCallback(updateVideoFeed)
        }
        callUI.showControls(initiateCallEnd)

        if (!annot) {
          annot = new AnnotationCanvas()
          annot.mount()
        }
        // have to be updated
        callUI.setLocalStreams(Object.values(lStreams))

        call.on('error', e => {
          app.debug.warn('Call error:', e)
          initiateCallEnd()
        })
        call.on('stream', (rStream) => {
          callUI?.addRemoteStream(rStream, call.peer)
          const onInteraction = () => { // do only if document.hidden ?
            callUI?.playRemote()
            document.removeEventListener('click', onInteraction)
          }
          document.addEventListener('click', onInteraction)
        })

        // remote video on/off/camera change
        lStreams[call.peer].onVideoTrack(vTrack => {
          const sender = call.peerConnection.getSenders().find(s => s.track?.kind === 'video')
          if (!sender) {
            app.debug.warn('No video sender found')
            return
          }
          app.debug.log('sender found:', sender)
          void sender.replaceTrack(vTrack)
        })

        call.answer(lStreams[call.peer].stream)
        document.addEventListener('visibilitychange', () => {
          initiateCallEnd()
        })

        this.setCallingState(CallingState.True)
        if (!callEndCallback) { callEndCallback = this.options.onCallStart?.() }

        const callingPeerIds = Object.keys(calls)
        sessionStorage.setItem(this.options.session_calling_peer_key, JSON.stringify(callingPeerIds))
        this.emit('UPDATE_SESSION', { agentIds: callingPeerIds, isCallActive: true, })
      }).catch(reason => { // in case of Confirm.remove() without user answer (not a error)
        app.debug.log(reason)
      })
    })

    app.nodes.attachNodeCallback((node) => {
      const id = app.nodes.getID(node)
      if (id && hasTag(node, 'canvas')) {
        const canvasPId = `${app.getProjectKey()}-${sessionId}-${id}`
        if (!this.canvasPeer) this.canvasPeer = new safeCastedPeer(canvasPId, peerOptions) as Peer
        const canvasHandler = new Canvas(
          node as unknown as HTMLCanvasElement,
          id,
          30,
          (stream: MediaStream) => {
            Object.values(this.agents).forEach(agent => {
              if (agent.agentInfo) {
                const target = `${agent.agentInfo.peerId}-${agent.agentInfo.id}-canvas`
                const connection = this.canvasPeer?.connect(target)
                connection?.on('open', () => {
                  if (agent.agentInfo) {
                    const pCall = this.canvasPeer?.call(target, stream)
                    pCall?.on('error', app.debug.error)
                  }
                })
                connection?.on('error', app.debug.error)
                this.canvasPeer?.on('error', app.debug.error)
              } else {
                app.debug.error('Assist: cant establish canvas peer to agent, no agent info')
              }
            })
          },
          app.debug.error,
        )
        this.canvasMap.set(id, canvasHandler)
      }
    })
  }

  private playNotificationSound() {
    if ('Audio' in window) {
      new Audio('https://static.openreplay.com/tracker-assist/notification.mp3')
      .play()
      .catch(e => {
        this.app.debug.warn(e)
      })
    }
  }

  private clean() {
    // sometimes means new agent connected so we keep id for control
    this.remoteControl?.releaseControl(false, true)
    if (this.peer) {
      this.peer.destroy()
      this.app.debug.log('Peer destroyed')
    }
    if (this.socket) {
      this.socket.disconnect()
      this.app.debug.log('Socket disconnected')
    }
  }
}

/** simple peers impl
 * const slPeer = new SLPeer({ initiator: true, stream: stream, })
 *               // slPeer.on('signal', (data: any) => {
 *               //   this.emit('c_signal', { data, id, })
 *               // })
 *               // this.socket?.on('c_signal', (tab: string, data: any) => {
 *               //   console.log(data)
 *               //   slPeer.signal(data)
 *               // })
 *               // slPeer.on('error', console.error)
 *               // this.emit('canvas_stream', { canvasId, })
 * */
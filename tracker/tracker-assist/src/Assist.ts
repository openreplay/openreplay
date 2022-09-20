/* eslint-disable @typescript-eslint/no-empty-function */
import type { Socket, } from 'socket.io-client'
import { connect, } from 'socket.io-client'
import Peer, { MediaConnection, } from 'peerjs'
import type { Properties, } from 'csstype'
import { App, } from '@openreplay/tracker'

import RequestLocalStream, { LocalStream, } from './LocalStream.js'
import RemoteControl, { RCStatus, } from './RemoteControl.js'
import CallWindow from './CallWindow.js'
import AnnotationCanvas from './AnnotationCanvas.js'
import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js'
import { callConfirmDefault, } from './ConfirmWindow/defaults.js'
import type { Options as ConfirmOptions, } from './ConfirmWindow/defaults.js'

// TODO: fully specified strict check with no-any (everywhere)

type StartEndCallback = () => ((()=>Record<string, unknown>) | void)

export interface Options {
  onAgentConnect: StartEndCallback,
  onCallStart: StartEndCallback,
  onRemoteControlStart: StartEndCallback,
  session_calling_peer_key: string,
  session_control_peer_key: string,
  callConfirm: ConfirmOptions,
  controlConfirm: ConfirmOptions,

  // @depricated
  confirmText?: string,
  // @depricated
  confirmStyle?: Properties,

  config: RTCConfiguration,
  callUITemplate?: string,
}


enum CallingState {
  Requesting,
  True,
  False,
};


// TODO typing????
type OptionalCallback = (()=>Record<string, unknown>) | void
type Agent = {
  onDisconnect?: OptionalCallback,
  onControlReleased?: OptionalCallback,
  //name?: string
  //
}

export default class Assist {
  readonly version = 'PACKAGE_VERSION'

  private socket: Socket | null = null
  private peer: Peer | null = null
  private assistDemandedRestart = false
  private callingState: CallingState = CallingState.False

  private agents: Record<string, Agent> = {}
  private readonly options: Options
  constructor(
    private readonly app: App,
    options?: Partial<Options>,
    private readonly noSecureMode: boolean = false,
  ) {
    this.options = Object.assign({
        session_calling_peer_key: '__openreplay_calling_peer',
        session_control_peer_key: '__openreplay_control_peer',
        config: null,
        onCallStart: ()=>{},
        onAgentConnect: ()=>{},
        onRemoteControlStart: ()=>{},
        callConfirm: {},
        controlConfirm: {}, // TODO: clear options passing/merging/overriting
      },
      options,
    )

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

  private emit(ev: string, ...args): void {
    this.socket && this.socket.emit(ev, ...args)
  }

  private get agentsConnected(): boolean {
    return Object.keys(this.agents).length > 0
  }

  private readonly setCallingState = (newState: CallingState): void => {
    this.callingState = newState
  }

  private onStart() {
    const app = this.app
    const sessionId = app.getSessionID()
    if (!sessionId) {
      return app.debug.error('No session ID')
    }
    const peerID = `${app.getProjectKey()}-${sessionId}`

    // SocketIO
    const socket = this.socket = connect(app.getHost(), {
      path: '/ws-assist/socket',
      query: {
        'peerId': peerID,
        'identity': 'session',
        'sessionInfo': JSON.stringify({
          pageTitle: document.title,
          active: true,
          ...this.app.getSessionInfo(),
        }),
      },
      transports: ['websocket',],
    })
    socket.onAny((...args) => app.debug.log('Socket:', ...args))

    const remoteControl = new RemoteControl(
      this.options,
      id => {
        if (!callUI) {
          callUI = new CallWindow(app.debug.error, this.options.callUITemplate)
        }
        callUI?.showRemoteControl(remoteControl.releaseControl)
        this.agents[id].onControlReleased = this.options.onRemoteControlStart()
        this.emit('control_granted', id)
        annot = new AnnotationCanvas()
        annot.mount()
        return callingAgents.get(id)
      },
      id => {
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
      },
    )

    // TODO: check incoming args
    socket.on('request_control', remoteControl.requestControl)
    socket.on('release_control', remoteControl.releaseControl)
    socket.on('scroll', remoteControl.scroll)
    socket.on('click', remoteControl.click)
    socket.on('move', remoteControl.move)
    socket.on('focus', (clientID, nodeID) => {
      const el = app.nodes.getNode(nodeID)
      if (el instanceof HTMLElement) {
        remoteControl.focus(clientID, el)
      }
    })
    socket.on('input', remoteControl.input)

    let annot: AnnotationCanvas | null = null
    socket.on('moveAnnotation', (_, p) => annot && annot.move(p)) // TODO: restrict by id
    socket.on('startAnnotation', (_, p) => annot && annot.start(p))
    socket.on('stopAnnotation', () => annot && annot.stop())

    socket.on('NEW_AGENT', (id: string, info) => {
      this.agents[id] = {
        onDisconnect: this.options.onAgentConnect?.(),
        ...info, // TODO
      }
      this.assistDemandedRestart = true
      this.app.stop()
      this.app.start().then(() => { this.assistDemandedRestart = false }).catch(e => app.debug.error(e))
    })
    socket.on('AGENTS_CONNECTED', (ids: string[]) => {
      ids.forEach(id =>{
        this.agents[id] = {
          onDisconnect: this.options.onAgentConnect?.(),
        }
      })
      this.assistDemandedRestart = true
      this.app.stop()
      this.app.start().then(() => { this.assistDemandedRestart = false }).catch(e => app.debug.error(e))

      remoteControl.reconnect(ids)
    })

    socket.on('AGENT_DISCONNECTED', (id) => {
      remoteControl.releaseControl()

      this.agents[id]?.onDisconnect?.()
      delete this.agents[id]

      endAgentCall(id)
    })
    socket.on('NO_AGENT', () => {
      Object.values(this.agents).forEach(a => a.onDisconnect?.())
      this.agents = {}
    })
    socket.on('call_end', (id) => {
      if (!callingAgents.has(id)) {
        app.debug.warn('Received call_end from unknown agent', id)
        return
      }
      endAgentCall(id)
    })

    socket.on('_agent_name', (id, name) => {
      callingAgents.set(id, name)
      updateCallerNames()
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
      host: app.getHost(),
      path: '/assist',
      port: location.protocol === 'http:' && this.noSecureMode ? 80 : 443,
      //debug: appOptions.__debug_log ? 2 : 0, // 0 Print nothing //1 Prints only errors. / 2 Prints errors and warnings. / 3 Prints all logs.
    }
    if (this.options.config) {
      peerOptions['config'] = this.options.config
    }
    const peer = this.peer = new Peer(peerID, peerOptions)

    // @ts-ignore (peerjs typing)
    peer.on('error', e => app.debug.warn('Peer error: ', e.type, e))
    peer.on('disconnected', () => peer.reconnect())

    // Common for all incoming call requests
    let callUI: CallWindow | null = null
    function updateCallerNames() {
      callUI?.setAssistentName(callingAgents)
    }
    // TODO: incapsulate
    let callConfirmWindow: ConfirmWindow | null = null
    let callConfirmAnswer: Promise<boolean> | null = null
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
    let callEndCallback: ReturnType<StartEndCallback> | null = null
    const handleCallEnd = () => { // Completle stop and clear all calls
      // Streams
      Object.values(calls).forEach(call => call.close())
      Object.keys(calls).forEach(peerId => {
        delete calls[peerId]
      })
      Object.values(lStreams).forEach((stream) => { stream.stop() })
      Object.keys(lStreams).forEach((peerId: string) => { delete lStreams[peerId] })

      // UI
      closeCallConfirmWindow()
      if (remoteControl.status === RCStatus.Disabled) {
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

    peer.on('call', (call) => {
      app.debug.log('Incoming call: ', call)
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
          app.debug.error('Audio mediadevice request error:', e)
          initiateCallEnd()
          return
        }

        // UI
        if (!callUI) {
          callUI = new CallWindow(app.debug.error, this.options.callUITemplate)
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
          callUI?.addRemoteStream(rStream)
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
        this.setCallingState(CallingState.True)
        if (!callEndCallback) { callEndCallback = this.options.onCallStart?.() }

        const callingPeerIds = Object.keys(calls)
        sessionStorage.setItem(this.options.session_calling_peer_key, JSON.stringify(callingPeerIds))
        this.emit('UPDATE_SESSION', { agentIds: callingPeerIds, isCallActive: true, })
      }).catch(reason => { // in case of Confirm.remove() without user answer (not a error)
        app.debug.log(reason)
      })
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

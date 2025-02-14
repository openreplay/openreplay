/* eslint-disable @typescript-eslint/no-empty-function */
import type { Socket } from 'socket.io-client'
import { connect } from 'socket.io-client'
import type { Properties } from 'csstype'
import { App } from '@openreplay/tracker'

import RequestLocalStream, { LocalStream } from './LocalStream.js'
import { hasTag } from './guards.js'
import RemoteControl, { RCStatus } from './RemoteControl.js'
import CallWindow from './CallWindow.js'
import AnnotationCanvas from './AnnotationCanvas.js'
import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js'
import { callConfirmDefault } from './ConfirmWindow/defaults.js'
import type { Options as ConfirmOptions } from './ConfirmWindow/defaults.js'
import ScreenRecordingState from './ScreenRecordingState.js'
import { pkgVersion } from './version.js'
import Canvas from './Canvas.js'
import { gzip } from 'fflate'

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
  serverURL: string;
  callUITemplate?: string;
  compressionEnabled: boolean;
  /**
   * Minimum amount of messages in a batch to trigger compression run
   * @default 5000
   */
  compressionMinBatchSize: number;
}

enum CallingState {
  Requesting,
  True,
  False,
}

type OptionalCallback = (() => Record<string, unknown>) | void
type Agent = {
  onDisconnect?: OptionalCallback,
  onControlReleased?: OptionalCallback,
  agentInfo: AgentInfo | undefined
  //
}


export default class Assist {
  readonly version = pkgVersion

  private socket: Socket | null = null
  private calls: Record<string, RTCPeerConnection> = {};
  private canvasPeers: Record<number, RTCPeerConnection | null> = {}
  private canvasNodeCheckers: Map<number, any> = new Map()
  private assistDemandedRestart = false
  private callingState: CallingState = CallingState.False
  private remoteControl: RemoteControl | null = null;
  private peerReconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private agents: Record<string, Agent> = {}
  private readonly options: Options
  private readonly canvasMap: Map<number, Canvas> = new Map()

  // Для локального аудио/видео потока
  private localStream: MediaStream | null = null;
  private isCalling: boolean = false;

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
      onCallStart: () => { },
      onAgentConnect: () => { },
      onRemoteControlStart: () => { },
      callConfirm: {},
      controlConfirm: {}, // TODO: clear options passing/merging/overwriting
      recordingConfirm: {},
      socketHost: '',
      compressionEnabled: false,
      compressionMinBatchSize: 5000,
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
        const batchSize = messages.length
        // @ts-ignore No need in statistics messages. TODO proper filter
        if (batchSize === 2 && messages[0]._id === 0 && messages[1]._id === 49) { return }
        if (batchSize > this.options.compressionMinBatchSize && this.options.compressionEnabled) {
          const toSend: any[] = []
          if (batchSize > 10000) {
            const middle = Math.floor(batchSize / 2)
            const firstHalf = messages.slice(0, middle)
            const secondHalf = messages.slice(middle)

            toSend.push(firstHalf)
            toSend.push(secondHalf)
          } else {
            toSend.push(messages)
          }
          toSend.forEach(batch => {
            const str = JSON.stringify(batch)
            const byteArr = new TextEncoder().encode(str)
            gzip(byteArr, { mtime: 0, }, (err, result) => {
              if (err) {
                this.emit('messages', batch)
              } else {
                this.emit('messages_gz', result)
              }
            })
          })
        } else {
          this.emit('messages', messages)
        }
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
  private getHost(): string {
    if (this.options.socketHost) {
      return this.options.socketHost
    }
    if (this.options.serverURL) {
      return new URL(this.options.serverURL).host
    }
    return this.app.getHost()
  }
  private getBasePrefixUrl(): string {
    if (this.options.serverURL) {
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
      path: this.getBasePrefixUrl() + '/ws-assist/socket',
      query: {
        'peerId': peerID,
        'identity': 'session',
        'tabId': this.app.getTabId(),
        'sessionInfo': JSON.stringify({
          'uxtId': this.app.getUxtId() ?? undefined,
          pageTitle: document.title,
          active: true,
          assistOnly: this.app.socketMode,
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
      socket.on('close', (e) => {
        console.warn('Socket closed:', e);
      })
    })

    const onGrand = (id: string) => {
      if (!callUI) {
        callUI = new CallWindow(app.debug.error, this.options.callUITemplate)
      }
      if (this.remoteControl) {
        callUI?.showRemoteControl(this.remoteControl.releaseControl)
      }
      this.agents[id] = { ...this.agents[id], onControlReleased: this.options.onRemoteControlStart(this.agents[id]?.agentInfo), }
      this.emit('control_granted', id)
      annot = new AnnotationCanvas()
      annot.mount()
      return callingAgents.get(id)
    }
    const onRelease = (id?: string | null, isDenied?: boolean) => {
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
        this.app.waitStatus(0)
          .then(() => {
            this.app.allowAppStart()
            setTimeout(() => {
              this.app.start().then(() => { this.assistDemandedRestart = false })
                .then(() => {
                  this.remoteControl?.reconnect([id,])
                })
                .catch(e => app.debug.error(e))
              // TODO: check if it's needed; basically allowing some time for the app to finish everything before starting again
            }, 100)
          })
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
        this.app.waitStatus(0)
          .then(() => {
            this.app.allowAppStart()
            setTimeout(() => {
              this.app.start().then(() => { this.assistDemandedRestart = false })
                .then(() => {
                  this.remoteControl?.reconnect(ids)
                })
                .catch(e => app.debug.error(e))
            }, 100)
          })
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

      if (!this.isCalling) {
        setupCallSignaling();
      }
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
    const lStreams: Record<string, LocalStream> = {}

    function updateCallerNames() {
      callUI?.setAssistentName(callingAgents)
    }
    function endAgentCall(id: string) {
      callingAgents.delete(id)
      if (callingAgents.size === 0) {
        handleCallEnd()
      } else {
        updateCallerNames()
        //TODO: close() specific call and corresponding lStreams (after connecting peerId & socket.io id)
      }
    }
    const handleCallEnd = () => { // Complete stop and clear all calls
      // Streams
      Object.values(this.calls).forEach(pc => pc.close())
      Object.keys(this.calls).forEach(peerId => {
        delete this.calls[peerId]
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

      this.emit('UPDATE_SESSION', { agentIds: [], isCallActive: false })
      this.setCallingState(CallingState.False)
      sessionStorage.removeItem(this.options.session_calling_peer_key)

      callEndCallback?.()
    }
    const closeCallConfirmWindow = () => {
      if (callConfirmWindow) {
        callConfirmWindow.remove()
        callConfirmWindow = null
        callConfirmAnswer = null
      }
    }

    const setupCallSignaling = () => {
      console.log("SETUP CALL 2");
      socket.on('webrtc_call_offer', async (_, data: { from: string, offer: RTCSessionDescriptionInit }) => {
        console.log('Incoming call offer from', data, data.from, data.offer);
        await handleIncomingCallOffer(data.from, data.offer);
      });
      socket.on('webrtc_call_answer', async (data: { from: string, answer: RTCSessionDescriptionInit }) => {
        const pc = this.calls[data.from];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          } catch (e) {
            app.debug.error('Error setting remote description from answer', e);
          }
        }
      });
      socket.on('webrtc_ice_candidate', async (data: { from: string, candidate: RTCIceCandidateInit }) => {
        const pc = this.calls[data.from];
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            app.debug.error('Error adding ICE candidate', e);
          }
        }
      });
    };

    const handleIncomingCallOffer = async (from: string, offer: RTCSessionDescriptionInit) => {
      app.debug.log('handleIncomingCallOffer', from)
      let confirmAnswer: Promise<boolean>
      const callingPeerIds = JSON.parse(sessionStorage.getItem(this.options.session_calling_peer_key) || '[]')
      if (callingPeerIds.includes(from) || this.callingState === CallingState.True) {
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

      try {
        const agreed = await confirmAnswer
        if (!agreed) {
          initiateCallEnd()
          this.options.onCallDeny?.()
          return
        }
        // Request local stream for the new connection
        if (!lStreams[from]) {
          app.debug.log('starting new stream for', from)
          lStreams[from] = await RequestLocalStream()
        }
        const pc = new RTCPeerConnection(this.options.config);
        lStreams[from].stream.getTracks().forEach(track => {
          pc.addTrack(track, lStreams[from].stream);
        });
        // Обработка ICE-кандидатов
        console.log("should generate ice");

        pc.onicecandidate = (event) => {
          console.log("GENERATING ICE CANDIDATE", event);
          if (event.candidate) {
            socket.emit('webrtc_ice_candidate', { to: from, candidate: event.candidate });
          }
        };
        // Обработка входящего медиапотока
        pc.ontrack = (event) => {
          const rStream = event.streams[0];
          if (rStream && callUI) {
            callUI.addRemoteStream(rStream, from);
            const onInteraction = () => {
              callUI?.playRemote();
              document.removeEventListener('click', onInteraction);
            };
            document.addEventListener('click', onInteraction);
          }
        };
        // Сохраняем соединение
        this.calls[from] = pc;
        // устанавливаем remote description, создаём answer
        console.log('1111111', offer);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('2222222');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc_call_answer', { to: from, answer });
        if (!callUI) {
          callUI = new CallWindow(app.debug.error, this.options.callUITemplate)
          callUI.setVideoToggleCallback((args: { enabled: boolean }) =>
            this.emit('videofeed', { streamId: from, enabled: args.enabled })
          );
        }
        callUI.showControls(initiateCallEnd)
        if (!annot) {
          annot = new AnnotationCanvas()
          annot.mount()
        }
        callUI.setLocalStreams(Object.values(lStreams))
        // Обработка ошибок соединения
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            initiateCallEnd();
          }
        };
        // Обновление трека при изменении локального видео
        lStreams[from].onVideoTrack(vTrack => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (!sender) {
            app.debug.warn('No video sender found')
            return
          }
          sender.replaceTrack(vTrack)
        })
        document.addEventListener('visibilitychange', () => {
          initiateCallEnd()
        })
        this.setCallingState(CallingState.True)
        if (!callEndCallback) { callEndCallback = this.options.onCallStart?.() }
        const callingPeerIdsNow = Object.keys(this.calls)
        sessionStorage.setItem(this.options.session_calling_peer_key, JSON.stringify(callingPeerIdsNow))
        this.emit('UPDATE_SESSION', { agentIds: callingPeerIdsNow, isCallActive: true })
      } catch (reason) {
        app.debug.log(reason);
      }
    };

    // Функции запроса подтверждения, завершения вызова, уведомления и т.д.
    const requestCallConfirm = () => {
      if (callConfirmAnswer) { // Если уже запрошено подтверждение
        return callConfirmAnswer;
      }
      callConfirmWindow = new ConfirmWindow(callConfirmDefault(this.options.callConfirm || {
        text: this.options.confirmText,
        style: this.options.confirmStyle,
      }));
      return callConfirmAnswer = callConfirmWindow.mount().then(answer => {
        closeCallConfirmWindow();
        return answer;
      });
    };

    const initiateCallEnd = () => {
      this.emit('call_end');
      handleCallEnd();
    };

    const startCanvasStream = (stream: MediaStream, id: number) => {
      const canvasPID = `${app.getProjectKey()}-${sessionId}-${id}`;
      if (!this.canvasPeers[id]) {
        this.canvasPeers[id] = new RTCPeerConnection(this.options.config);
      }
      const pc = this.canvasPeers[id];
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Добавить отправку ICE-кандидата через socket
        }
      };
      Object.values(this.agents).forEach(agent => {
        if (agent.agentInfo) {
          // реализовать сигналинг для canvas чтобы агент создал свой RTCPeerConnection для canvas
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
          
        } else {
          app.debug.error('Assist: cant establish canvas peer to agent, no agent info')
        }
      })
    }

    app.nodes.attachNodeCallback((node) => {
      const id = app.nodes.getID(node)
      if (id && hasTag(node, 'canvas')) {
        app.debug.log(`Creating stream for canvas ${id}`)
        const canvasHandler = new Canvas(
          node as unknown as HTMLCanvasElement,
          id,
          30,
          (stream: MediaStream) => {
            startCanvasStream(stream, id)
          },
          app.debug.error,
        )
        this.canvasMap.set(id, canvasHandler)
        if (this.canvasNodeCheckers.has(id)) {
          clearInterval(this.canvasNodeCheckers.get(id))
        }
        const int = setInterval(() => {
          const isPresent = node.ownerDocument.defaultView && node.isConnected
          if (!isPresent) {
            canvasHandler.stop()
            this.canvasMap.delete(id)
            if (this.canvasPeers[id]) {
              this.canvasPeers[id]?.close()
              this.canvasPeers[id] = null
            }
            clearInterval(int)
          }
        }, 5000)
        this.canvasNodeCheckers.set(id, int)
      }
    });
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
    // sometimes means new agent connected, so we keep id for control
    this.remoteControl?.releaseControl(false, true);
    if (this.peerReconnectTimeout) {
      clearTimeout(this.peerReconnectTimeout)
      this.peerReconnectTimeout = null
    }
    Object.values(this.calls).forEach(pc => pc.close())
    this.calls = {}
    if (this.socket) {
      this.socket.disconnect()
      this.app.debug.log('Socket disconnected')
    }
    this.canvasMap.clear()
    this.canvasPeers = {}
    this.canvasNodeCheckers.forEach((int) => clearInterval(int))
    this.canvasNodeCheckers.clear()
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
import type { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import Peer from 'peerjs';
import type { Properties } from 'csstype';
import { App } from '@openreplay/tracker';

import RequestLocalStream from './LocalStream.js';
import RemoteControl from './RemoteControl.js';
import CallWindow from './CallWindow.js';
import AnnotationCanvas from './AnnotationCanvas.js';
import ConfirmWindow from './ConfirmWindow/ConfirmWindow.js';
import { callConfirmDefault } from './ConfirmWindow/defaults.js';
import type { Options as ConfirmOptions } from './ConfirmWindow/defaults.js';

// TODO: fully specified  strict check (everywhere)

//@ts-ignore  peerjs hack for webpack5 (?!) TODO: ES/node modules;
Peer = Peer.default || Peer;

type StartEndCallback = () => ((()=>{}) | void)

export interface Options {
  onAgentConnect: StartEndCallback,
  onCallStart: StartEndCallback,
  onRemoteControlStart: StartEndCallback,
  session_calling_peer_key: string,
  session_control_peer_key: string,
  callConfirm: ConfirmOptions,
  controlConfirm: ConfirmOptions,

  confirmText?: string, // @depricated
  confirmStyle?: Properties, // @depricated

  config: RTCConfiguration,
}


enum CallingState {
  Requesting,
  True,
  False,
};


// TODO typing????
type OptionalCallback = (()=>{}) | void
type Agent = {
  onDisconnect?: OptionalCallback,
  onControlReleased?: OptionalCallback,
  name?: string
  //
}

export default class Assist {
  readonly version = "PACKAGE_VERSION"

  private socket: Socket | null = null
  private peer: Peer | null = null
  private assistDemandedRestart: boolean = false
  private callingState: CallingState = CallingState.False

  private agents: Record<string, Agent> = {}
  private readonly options: Options
  constructor(
    private readonly app: App, 
    options?: Partial<Options>, 
    private readonly noSecureMode: boolean = false,
  ) {
    this.options = Object.assign({ 
        session_calling_peer_key: "__openreplay_calling_peer",
        session_control_peer_key: "__openreplay_control_peer",
        config: null,
        onCallStart: ()=>{},
        onAgentConnect: ()=>{},
        onRemoteControlStart: ()=>{},
        callConfirm: {},
        controlConfirm: {}, // TODO: clear options passing/merging/overriting
      },
      options,
    );

    if (document.hidden !== undefined) {
      const sendActivityState = () => this.emit("UPDATE_SESSION", { active: !document.hidden })
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
      this.emit("UPDATE_SESSION", { pageTitle: document.title })
    })
    app.attachStartCallback(() => { 
      if (this.assistDemandedRestart) { return; }
      this.onStart()
      observer && observer.observe(titleNode, { subtree: true, characterData: true, childList: true })
    })
    app.attachStopCallback(() => { 
      if (this.assistDemandedRestart) { return; } 
      this.clean()
      observer && observer.disconnect()
    })
    app.attachCommitCallback((messages) => {
      if (this.agentsConnected) {
        // @ts-ignore No need in statistics messages. TODO proper filter
        if (messages.length === 2 && messages[0]._id === 0 &&  messages[1]._id === 49) { return }
        this.emit("messages", messages)
      }
    })
    app.session.attachUpdateCallback(sessInfo => this.emit("UPDATE_SESSION", sessInfo))
  }

  private emit(ev: string, ...args) {
    this.socket && this.socket.emit(ev, ...args)
  }

  private get agentsConnected(): boolean {
    return Object.keys(this.agents).length > 0
  }

  private notifyCallEnd() {
    this.emit("call_end");
  }
  private onRemoteCallEnd = () => {}

  private onStart() {
    const app = this.app
    const peerID = `${app.getProjectKey()}-${app.getSessionID()}`

    // SocketIO
    const socket = this.socket = io(app.getHost(), {
      path: '/ws-assist/socket',
      query: {
        "peerId": peerID,
        "identity": "session",
        "sessionInfo": JSON.stringify({ 
          pageTitle: document.title, 
          ...this.app.getSessionInfo() 
        }),
      },
      transports: ["websocket"],
    })
    socket.onAny((...args) => app.debug.log("Socket:", ...args))



    const remoteControl = new RemoteControl(
      this.options,
      id => {
        this.agents[id].onControlReleased = this.options.onRemoteControlStart()
        this.emit("control_granted", id)
        annot = new AnnotationCanvas()
        annot.mount()
      },
      id => {
        const cb = this.agents[id].onControlReleased
        delete this.agents[id].onControlReleased
        typeof cb === "function" && cb()
        this.emit("control_rejected", id)
        if (annot != null) {
          annot.remove()
          annot = null
        }
      },
    )

    // TODO: check incoming args
    socket.on("request_control", remoteControl.requestControl)
    socket.on("release_control", remoteControl.releaseControl)
    socket.on("scroll", remoteControl.scroll)
    socket.on("click", remoteControl.click)
    socket.on("move", remoteControl.move)
    socket.on("focus", (clientID, nodeID) => {
      const el = app.nodes.getNode(nodeID)
      if (el instanceof HTMLElement) {
        remoteControl.focus(clientID, el)
      }
    })
    socket.on("input", remoteControl.input)

    let annot: AnnotationCanvas | null = null
    socket.on("moveAnnotation", (_, p) => annot && annot.move(p)) // TODO: restrict by id
    socket.on("startAnnotation", (_, p) => annot && annot.start(p))
    socket.on("stopAnnotation", () => annot && annot.stop())

    socket.on("NEW_AGENT", (id: string, info) => {
      this.agents[id] = {
        onDisconnect: this.options.onAgentConnect && this.options.onAgentConnect(),
        ...info, // TODO
      }
      this.assistDemandedRestart = true
      this.app.stop();
      this.app.start().then(() => { this.assistDemandedRestart = false })
    })
    socket.on("AGENTS_CONNECTED", (ids: string[]) => {
      ids.forEach(id =>{
        this.agents[id] = {
          onDisconnect: this.options.onAgentConnect && this.options.onAgentConnect(),
        }
      })
      this.assistDemandedRestart = true
      this.app.stop();
      this.app.start().then(() => { this.assistDemandedRestart = false })

      remoteControl.reconnect(ids)
    })

    let confirmCall:ConfirmWindow | null = null

    socket.on("AGENT_DISCONNECTED", (id) => {
      remoteControl.releaseControl(id)

      // close the call also
      if (callingAgent === id) {
        confirmCall?.remove()
        this.onRemoteCallEnd()
      }

      // @ts-ignore (wtf, typescript?!)
      this.agents[id] && this.agents[id].onDisconnect != null && this.agents[id].onDisconnect()
      delete this.agents[id]
    })
    socket.on("NO_AGENT", () => {
      this.agents = {}
    })
    socket.on("call_end", () => this.onRemoteCallEnd()) // TODO: check if agent calling id

    // TODO: fix the code
    let agentName = ""
    let callingAgent = ""
    socket.on("_agent_name",(id, name) => { agentName = name; callingAgent = id })


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
    const peer = this.peer = new Peer(peerID, peerOptions);
    // app.debug.log('Peer created: ', peer)
    peer.on('error', e => app.debug.warn("Peer error: ", e.type, e))
    peer.on('disconnect', () => peer.reconnect())
    peer.on('call', (call) => {
      app.debug.log("Call: ", call)    
      if (this.callingState !== CallingState.False) {
        call.close()
        //this.notifyCallEnd() // TODO: strictly connect calling peer with agent socket.id
        app.debug.warn("Call closed instantly bacause line is busy. CallingState: ", this.callingState)
        return;
      }

      const setCallingState = (newState: CallingState) => {
        if (newState === CallingState.True) {
          sessionStorage.setItem(this.options.session_calling_peer_key, call.peer);
        } else if (newState === CallingState.False) {
          sessionStorage.removeItem(this.options.session_calling_peer_key);
        }
        this.callingState = newState;
      }
      
      let confirmAnswer: Promise<boolean>
      const callingPeer = sessionStorage.getItem(this.options.session_calling_peer_key)
      if (callingPeer === call.peer) {
        confirmAnswer = Promise.resolve(true)
      } else {
        setCallingState(CallingState.Requesting)
        confirmCall = new ConfirmWindow(callConfirmDefault(this.options.callConfirm || { 
          text: this.options.confirmText,
          style: this.options.confirmStyle,
        }))
        confirmAnswer = confirmCall.mount()
        this.playNotificationSound()
        this.onRemoteCallEnd = () => { // if call cancelled by a caller before confirmation
          app.debug.log("Received call_end during confirm window opened")
          confirmCall?.remove()
          setCallingState(CallingState.False)
          call.close()
        }
        setTimeout(() => {
          if (this.callingState !== CallingState.Requesting) { return }
          call.close()
          confirmCall?.remove()
          this.notifyCallEnd()
          setCallingState(CallingState.False)
        }, 30000)
      }

      confirmAnswer.then(agreed => {
        if (!agreed) {
          call.close()
          this.notifyCallEnd()
          setCallingState(CallingState.False)
          return
        }

        const callUI = new CallWindow()
        annot = new AnnotationCanvas()
        annot.mount()
        callUI.setAssistentName(agentName)
        
        const onCallEnd = this.options.onCallStart()
        const handleCallEnd = () => {
          app.debug.log("Handle Call End")
          call.close()
          callUI.remove()
          annot && annot.remove()
          annot = null
          setCallingState(CallingState.False)
          onCallEnd && onCallEnd()
        }
        const initiateCallEnd = () => {
          this.notifyCallEnd()
          handleCallEnd()
        }
        this.onRemoteCallEnd = handleCallEnd

        call.on('error', e => {
          app.debug.warn("Call error:", e)
          initiateCallEnd()
        });

        RequestLocalStream().then(lStream => {
          call.on('stream', function(rStream) {
            callUI.setRemoteStream(rStream);
            const onInteraction = () => { // only if hidden?
              callUI.playRemote()
              document.removeEventListener("click", onInteraction)
            }
            document.addEventListener("click", onInteraction)
          });

          lStream.onVideoTrack(vTrack => {
            const sender = call.peerConnection.getSenders().find(s => s.track?.kind === "video")
            if (!sender) {
              app.debug.warn("No video sender found")
              return
            }
            app.debug.log("sender found:", sender)
            sender.replaceTrack(vTrack)
          })

          callUI.setCallEndAction(initiateCallEnd)
          callUI.setLocalStream(lStream)
          call.answer(lStream.stream)
          setCallingState(CallingState.True)
        })
        .catch(e => {
          app.debug.warn("Audio mediadevice request error:", e)
          initiateCallEnd()
        });
      }).catch(); // in case of Confirm.remove() without any confirmation/decline
    });
  }

  private playNotificationSound() {
    if ('Audio' in window) {
      new Audio("https://static.openreplay.com/tracker-assist/notification.mp3")
      .play()
      .catch(e => {
        this.app.debug.warn(e)
      })
    }
  }

  private clean() {
    if (this.peer) {
      this.peer.destroy()
      this.app.debug.log("Peer destroyed")
    }
    if (this.socket) {
      this.socket.disconnect()
      this.app.debug.log("Socket disconnected")
    }
  }
}
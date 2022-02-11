import type { Socket } from 'socket.io-client';
import io from 'socket.io-client';
import Peer from 'peerjs';
import type { Properties } from 'csstype';
import { App } from '@openreplay/tracker';

import RequestLocalStream from './LocalStream.js';
import Mouse from './Mouse.js';
import CallWindow from './CallWindow.js';
import ConfirmWindow, { callConfirmDefault, controlConfirmDefault } from './ConfirmWindow.js';
import type { Options as ConfirmOptions } from './ConfirmWindow.js';


//@ts-ignore  peerjs hack for webpack5 (?!) TODO: ES/node modules;
Peer = Peer.default || Peer;

export interface Options {
  onAgentConnect: () => ((()=>{}) | void),
  onCallStart: () => ((()=>{}) | void),
  session_calling_peer_key: string,
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


type Agent = {
  onDisconnect: ((()=>{}) | void), // TODO: better types here
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
        config: null,
        onCallStart: ()=>{},
        onAgentConnect: ()=>{},
        callConfirm: {},
        controlConfirm: {}, // TODO: clear options passing/merging/overriting
      },
      options,
    );
    app.attachStartCallback(() => { 
      if (this.assistDemandedRestart) { return; } 
      this.onStart()
    })
    app.attachCommitCallback((messages) => {
      if (this.socket && this.agentsConnected) {
        // @ts-ignore No need in statistics messages. TODO proper filter
        if (messages.length === 2 && messages[0]._id === 0 &&  messages[1]._id === 49) { return }
        this.socket.emit("messages", messages)
      }
    })
    app.attachStopCallback(() => { 
      if (this.assistDemandedRestart) { return; } 
      this.clean()
    })
  }

  private get agentsConnected(): boolean {
    return Object.keys(this.agents).length > 0
  }

  private notifyCallEnd() {
    this.socket && this.socket.emit("call_end");
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
        "sessionInfo": JSON.stringify(this.app.getSessionInfo()),
      }
    })
    socket.onAny((...args) => app.debug.log("Socket:", ...args))

    socket.on("NEW_AGENT", (id: string, info) => {
      this.agents[id] = {
        onDisconnect: this.options.onAgentConnect && this.options.onAgentConnect(),
        ...info, // TODO
      }
      this.assistDemandedRestart = true
      this.app.stop();
      this.app.start().then(() => { this.assistDemandedRestart = false })
    })
    socket.on("AGENTS_CONNECTED", (ids) => {
      ids.forEach(id =>{
        this.agents[id] = {
          onDisconnect: this.options.onAgentConnect && this.options.onAgentConnect(),
        }
      })
      this.assistDemandedRestart = true
      this.app.stop();
      this.app.start().then(() => { this.assistDemandedRestart = false })
    })

    let confirmRC: ConfirmWindow | null = null
    const mouse = new Mouse()     // TODO: lazy init
    let controllingAgent: string | null = null
    function releaseControl() {
      confirmRC?.remove()
      mouse.remove()
      controllingAgent = null
    }
    socket.on("request_control", (id: string) => {
      if (controllingAgent !== null) { 
        socket.emit("control_rejected", id)
        return
      }
      controllingAgent = id
      confirmRC = new ConfirmWindow(controlConfirmDefault(this.options.controlConfirm))
      confirmRC.mount().then(allowed => {
        if (allowed) { // TODO: per agent id
          mouse.mount()
          socket.emit("control_granted", id)
        } else {
          releaseControl()
          socket.emit("control_rejected", id)
        }
      }).catch()
    })
    socket.on("release_control", (id: string) => {
      if (controllingAgent !== id) { return }
      releaseControl()
    })
    socket.on("scroll", (id, d) => { id === controllingAgent && mouse.scroll(d) })
    socket.on("click", (id, xy) => { id === controllingAgent && mouse.click(xy) })
    socket.on("move", (id, xy) => { id === controllingAgent && mouse.move(xy) })

    let confirmCall:ConfirmWindow | null = null

    socket.on("AGENT_DISCONNECTED", (id) => {
      // @ts-ignore (wtf, typescript?!)
      this.agents[id] && this.agents[id].onDisconnect != null && this.agents[id].onDisconnect()
      delete this.agents[id]

      controllingAgent === id && releaseControl()

      // close the call also
      if (callingAgent === id) {
        confirmCall?.remove()
        this.onRemoteCallEnd()
      }
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
    app.debug.log('Peer created: ', peer)
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
        this.onRemoteCallEnd = () => { // if call cancelled by a caller before confirmation
          app.debug.log("Received call_end during confirm window opened")
          confirmCall?.remove()
          setCallingState(CallingState.False)
        }
      }

      confirmAnswer.then(agreed => {
        if (!agreed) {
          call.close()
          this.notifyCallEnd()
          setCallingState(CallingState.False)
          return
        }

        let callUI = new CallWindow()
        callUI.setAssistentName(agentName)
        
        const onCallEnd = this.options.onCallStart()
        const handleCallEnd = () => {
          call.close()
          callUI.remove()
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
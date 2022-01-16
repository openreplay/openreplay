import './_slim.js';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { App, Messages } from '@openreplay/tracker';
import type Message from '@openreplay/tracker';

import BufferingConnection from './BufferingConnection.js';
import Mouse from './Mouse.js';
import CallWindow from './CallWindow.js';
import ConfirmWindow from './ConfirmWindow.js';
import RequestLocalStream from './LocalStream.js';

export interface Options {
  onAgentConnect: () => ((()=>{}) | void),
  onCallStart: () => ((()=>{}) | void),
  confirmText: string,
  confirmStyle: Object, // Styles object
  session_calling_peer_key: string,
  config: RTCConfiguration,
  // __messages_per_send?: number,
}

enum CallingState {
  Requesting,
  True,
  False,
};

//@ts-ignore  peerjs hack for webpack5 (?!) TODO: ES/node modules;
//Peer = Peer.default || Peer;

// type IncomeMessages =
//   "call_end" |
//   { type: "agent_name", name: string } |
//   { type: "click", x: number, y: number } |
//   { x: number, y: number }

export default function(opts?: Partial<Options>)  {
  const options: Options = Object.assign(
    { 
      confirmText: "You have an incoming call. Do you want to answer?",
      confirmStyle: {},
      session_calling_peer_key: "__openreplay_calling_peer",
      config: null,
      onCallStart: ()=>{},
      onAgentConnect: ()=>{},
    },
    opts,
  );
  return function(app: App | null, appOptions: { __debug_log?: boolean, __DISABLE_SECURE_MODE?: boolean } = {}) {
    // @ts-ignore
    if (app === null || !navigator?.mediaDevices?.getUserMedia) { // 93.04% browsers
      return;
    }

    function log(...args) {
      // TODO: use centralised warn/log from tracker (?)
      appOptions.__debug_log && console.log("OpenReplay Assist. ", ...args)
    }
    function warn(...args) {
      appOptions.__debug_log && console.warn("OpenReplay Assist. ", ...args)
    }

    let assistDemandedRestart = false
    let peer : Peer | null = null
    // This is required because internal peerjs connection list is not stable. https://peerjs.com/docs.html#peerconnections
    const openDataConnections: Record<string, BufferingConnection>  = {}

    app.addCommitCallback(function(messages) {
      Object.values(openDataConnections).forEach(buffConn => buffConn.send(messages))
    })

    app.attachStopCallback(function() {
      if (assistDemandedRestart) { return; }
      if (peer) {
        peer.destroy();
        log('Peer destroyed!')
      }
    });

    app.attachStartCallback(function() {
      if (assistDemandedRestart) { return; }
      const peerID = `${app.getProjectKey()}-${app.getSessionID()}`
      const _opt = {
        // @ts-ignore
        host: app.getHost(),
        path: '/assist',
        port: location.protocol === 'http:' && appOptions.__DISABLE_SECURE_MODE ? 80 : 443,
        //debug: // 0 Print nothing //1 Prints only errors. / 2 Prints errors and warnings. / 3 Prints all logs.
      }
      if (options.config) {
        _opt['config'] = options.config
      }
      peer = new Peer(peerID, _opt);
      log('Peer created: ', peer)
      peer.on('error', e => warn("Peer error: ", e.type, e))
      peer.on('connection', function(conn) {
        window.addEventListener("beforeunload", () => conn.open && conn.send("unload"));
        log('Connecting...')

        conn.on('open', function() {
          log('Connection opened.')
          assistDemandedRestart = true;
          app.stop();
          openDataConnections[conn.peer] = new BufferingConnection(conn)
          
          const onAgentDisconnect = options.onAgentConnect();
          conn.on('close', () => {
            onAgentDisconnect && onAgentDisconnect();
            log("Connection close: ", conn.peer)
            delete openDataConnections[conn.peer] // TODO: check if works properly
          })
          app.start().then(() => { assistDemandedRestart = false })
        });
      });


      let callingState: CallingState = CallingState.False;

      peer.on('call', function(call) {
        log("Call: ", call)
        if (!peer) { return; }
        const dataConn: DataConnection | undefined =
          openDataConnections[call.peer]?.conn;
        if (callingState !== CallingState.False || !dataConn || !dataConn.open) {
          call.close();
          warn("Call closed instantly: ", callingState, dataConn, dataConn.open)
          return;
        }

        function setCallingState(newState: CallingState) {
          if (newState === CallingState.True) {
            sessionStorage.setItem(options.session_calling_peer_key, call.peer);
          } else if (newState === CallingState.False) {
            sessionStorage.removeItem(options.session_calling_peer_key);
          }
          callingState = newState;
        }

        const notifyCallEnd = () => {
          dataConn.open && dataConn.send("call_end");
        }


        let confirmAnswer: Promise<boolean>
        const callingPeer = sessionStorage.getItem(options.session_calling_peer_key)
        if (callingPeer === call.peer) {
          confirmAnswer = Promise.resolve(true)
        } else {
          setCallingState(CallingState.Requesting);
          const confirm = new ConfirmWindow(options.confirmText, options.confirmStyle);
          confirmAnswer = confirm.mount();
          dataConn.on('data', (data) => { // if call cancelled by a caller before confirmation
            if (data === "call_end") {
              log("Received call_end during confirm window opened")
              confirm.remove();
              setCallingState(CallingState.False);
            }                    
          });
        }

        confirmAnswer.then(agreed => {
          if (!agreed || !dataConn.open) {
            !dataConn.open && warn("Call cancelled because data connection is closed.")
            call.close()
            notifyCallEnd()
            setCallingState(CallingState.False)
            return
          }

          const onCallEnd = options.onCallStart()

          const mouse = new Mouse()
          let callUI = new CallWindow()

          const handleCallEnd = () => {
            onCallEnd && onCallEnd()
            mouse.remove();
            callUI.remove();
            setCallingState(CallingState.False);
          }
          const initiateCallEnd = () => {
            log("initiateCallEnd")
            call.close()
            notifyCallEnd();
            handleCallEnd();
          }
          RequestLocalStream().then(lStream => {
            dataConn.on("close", handleCallEnd); // For what case?
            //call.on('close', onClose); // Works from time to time (peerjs bug)
            const checkConnInterval = setInterval(() => {
              if (!dataConn.open) {
                initiateCallEnd();
                clearInterval(checkConnInterval);
              }
              if (!call.open) {
                handleCallEnd();
                clearInterval(checkConnInterval);
              }
            }, 3000);
            call.on('error', e => {
              warn("Call error:", e)
              initiateCallEnd()
            });

            call.on('stream', function(rStream) {
              callUI.setRemoteStream(rStream);
              const onInteraction = () => { // only if hidden?
                callUI.playRemote()
                document.removeEventListener("click", onInteraction)
              }
              document.addEventListener("click", onInteraction)
            });
            dataConn.on('data', (data: any) => {
              log("Income data: ", data)
              if (!data) { return }
              if (data === "call_end") {
                return handleCallEnd();
              }
              if (data.name === 'string') {
                return callUI.setAssistentName(data.name);
              }
              if (data.type === "scroll" && Array.isArray(data.delta)) {
                return mouse.scroll(data.delta)
              }
              if (data.type === "click" && typeof data.x === 'number' && typeof data.y === 'number') {
                return mouse.click([ data.x, data.y ])
              }
              if (typeof data.x === 'number' && typeof data.y === 'number') {
                return mouse.move([ data.x, data.y ])
              }
            });

            lStream.onVideoTrack(vTrack => {
              const sender = call.peerConnection.getSenders().find(s => s.track?.kind === "video")
              if (!sender) {
                warn("No video sender found")
                return
              }
              log("sender found:", sender)
              sender.replaceTrack(vTrack)
            })

            callUI.setCallEndAction(initiateCallEnd)
            callUI.setLocalStream(lStream)
            call.answer(lStream.stream)
            setCallingState(CallingState.True)
          })
          .catch(e => {
            warn("Audio mediadevice request error:", e)
            handleCallEnd()
          });
        }).catch(); // in case of Confirm.remove() without any confirmation
      });
    });
  }
}

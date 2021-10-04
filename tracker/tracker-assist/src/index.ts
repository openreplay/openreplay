import './_slim';
import Peer, { MediaConnection } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { App, Messages } from '@openreplay/tracker';
import type Message from '@openreplay/tracker';

import BufferingConnection from './BufferingConnection';
import Mouse from './Mouse';
import CallWindow from './CallWindow';
import ConfirmWindow from './ConfirmWindow';


export interface Options {
  confirmText: string,
  confirmStyle: Object, // Styles object
  session_calling_peer_key: string,
}


enum CallingState {
  Requesting,
  True,
  False,
};

export default function(opts: Partial<Options> = {})  {
  const options: Options = Object.assign(
    { 
      confirmText: "You have a call. Do you want to answer?",
      confirmStyle: {},
      session_calling_peer_key: "__openreplay_calling_peer",
    },
    opts,
  );
  return function(app: App | null, appOptions: { __debug_log?: boolean, __DISABLE_SECURE_MODE?: boolean } = {}) {
    // @ts-ignore
    if (app === null || !navigator?.mediaDevices?.getUserMedia) { // 93.04% browsers
      return;
    }

    function log(...args) {
      // TODO: use warn/log from assist
      appOptions.__debug_log && console.log("OpenReplay Assist. ", ...args)
    }
    function warn(...args) {
      appOptions.__debug_log && console.warn("OpenReplay Assist. ", ...args)
    }

    let assistDemandedRestart = false
    let peer : Peer | null = null
    const openDataConnections: Record<string, BufferingConnection>  = {}

    app.addCommitCallback(function(messages) {
      Object.values(openDataConnections).forEach(buffConn => buffConn.send(messages))
    })

    app.attachStopCallback(function() {
      if (assistDemandedRestart) { return; }
      peer && peer.destroy();
    });

    app.attachStartCallback(function() {
      if (assistDemandedRestart) { return; }
      const peerID = `${app.getProjectKey()}-${app.getSessionID()}`
      peer = new Peer(peerID, {
              // @ts-ignore
        host: app.getHost(),
        path: '/assist',
        port: location.protocol === 'http:' && appOptions.__DISABLE_SECURE_MODE ? 80 : 443,
      });
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
          conn.on('close', () => {
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
        const peerOnCall = sessionStorage.getItem(options.session_calling_peer_key)
        if (peerOnCall === call.peer) {
          confirmAnswer = Promise.resolve(true)
        } else {
          setCallingState(CallingState.Requesting);
          const confirm = new ConfirmWindow(options.confirmText, options.confirmStyle);
          confirmAnswer = confirm.mount();
          dataConn.on('data', (data) => { // if call closed by a caller before confirm
            if (data === "call_end") {
              log("Recieved call_end during confirm opened")
              setCallingState(CallingState.False);
              confirm.remove();
            }                    
          });
        }

        confirmAnswer.then(agreed => {
          if (!agreed || !dataConn.open) {
            call.close();
            notifyCallEnd();
            setCallingState(CallingState.False);
            return;
          }

          const mouse = new Mouse();
          let callUI;

          const onCallConnect = lStream => {
            const onCallEnd = () => {
              mouse.remove();
              callUI?.remove();
              lStream.getTracks().forEach(t => t.stop());
              setCallingState(CallingState.False);
            }
            const initiateCallEnd = () => {
              log("initiateCallEnd")
              call.close()
              notifyCallEnd();
              onCallEnd();
            }

            call.answer(lStream);
            setCallingState(CallingState.True)

            dataConn.on("close", onCallEnd);

            //call.on('close', onClose); // Works from time to time (peerjs bug)
            const intervalID = setInterval(() => {
              if (!dataConn.open) {
                initiateCallEnd();
                clearInterval(intervalID);
              }
              if (!call.open) {
                onCallEnd();
                clearInterval(intervalID);
              }
            }, 3000);
            call.on('error', initiateCallEnd);

            callUI = new CallWindow(initiateCallEnd);
            callUI.setLocalStream(lStream, (stream) => {
              //let videoTrack = stream.getVideoTracks()[0];
              //lStream.addTrack(videoTrack);

              //call.peerConnection.addTrack(videoTrack);

              // call.peerConnection.getSenders()
              // var sender = call.peerConnection.getSenders().find(function(s) {
              //   return s.track .kind == videoTrack.kind;
              // });
              //sender.replaceTrack(videoTrack);
            });
            call.on('stream', function(rStream) {
              callUI.setRemoteStream(rStream);
              const onInteraction = () => {
                callUI.playRemote()
                document.removeEventListener("click", onInteraction)
              }
              document.addEventListener("click", onInteraction)
            });
            dataConn.on('data', (data: any) => {
              if (data === "call_end") {
                log('Recieved call_end during call')
                onCallEnd();
                return;
              }
              if (data && typeof data.name === 'string') {
                log('Recieved name: ', data.name)
                callUI.setAssistentName(data.name);
              }
              if (data && typeof data.x === 'number' && typeof data.y === 'number') {
                mouse.move(data);
              }
            });
          }

          navigator.mediaDevices.getUserMedia({video:true, audio:true})
          .then(onCallConnect)
          .catch(_ => { // TODO retry only if specific error
            navigator.mediaDevices.getUserMedia({audio:true}) // in case there is no camera on device
            .then(onCallConnect)
            .catch(e => warn("Can't reach media devices. ", e));
          });
        }).catch(); // in case of Confirm.remove() without any confirmation
      });
    });
  }
}

import './_slim';
import Peer, { MediaConnection } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { App, Messages } from '@openreplay/tracker';
import type Message from '@openreplay/tracker';

import Mouse from './Mouse';
import CallWindow from './CallWindow';
import ConfirmWindow from './ConfirmWindow';
import RequestLocalStream from './LocalStream';

export interface Options {
  confirmText: string,
  confirmStyle: Object, // Styles object
  session_calling_peer_key: string,
  config: Object
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
      config: null
    },
    opts,
  );
  return function(app: App | null, appOptions: { __DISABLE_SECURE_MODE?: boolean } = {}) {
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
      const peerID = `${app.projectKey}-${app.getSessionID()}`
      const _opt = {
        // @ts-ignore
        host: app.getHost(),
        path: '/assist',
        port: location.protocol === 'http:' && appOptions.__DISABLE_SECURE_MODE ? 80 : 443,
      }
      if (options.config) {
        _opt['config'] = options.config
      }
      peer = new Peer(peerID, _opt);
      console.log('OpenReplay tracker-assist peerID:', peerID)
      peer.on('error', e => console.log("OpenReplay tracker-assist peer error: ", e.type, e))
      peer.on('connection', function(conn) { 
        window.addEventListener("beforeunload", () => conn.open && conn.send("unload"));

        console.log('OpenReplay tracker-assist: Connecting...')
        conn.on('open', function() {
          
          console.log('OpenReplay tracker-assist: connection opened.')

          // TODO: onClose
          const buffer: Message[][] = [];
          let buffering = false;
          function sendNext() {
            if (buffer.length) {
              setTimeout(() => {
                conn.send(buffer.shift());
                sendNext();
              }, 50);
            } else {
              buffering = false;
            }
          }

          assistDemandedRestart = true;
          app.stop();
          //@ts-ignore (should update tracker dependency)
          app.addCommitCallback((messages: Array<Message>): void => {
            if (!conn.open) { return; } // TODO: clear commit callbacks on connection close
            let i = 0;
            while (i < messages.length) {
              buffer.push(messages.slice(i, i+=1000));
            }
            if (!buffering) { 
              buffering = true;
              sendNext(); 
            }
          });
          app.start().then(() => { assistDemandedRestart = false; });
        });
      });


      let callingState: CallingState = CallingState.False;

      peer.on('call', function(call) {
        if (!peer) { return; }
        const dataConn: DataConnection | undefined = peer
                .connections[call.peer].find(c => c.type === 'data');
        if (callingState !== CallingState.False || !dataConn) {
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
        const peerOnCall = sessionStorage.getItem(options.session_calling_peer_key)
        if (peerOnCall === call.peer) {
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

          const mouse = new Mouse()
          let callUI = new CallWindow()

          const onCallEnd = () => {
            mouse.remove();
            callUI.remove();
            setCallingState(CallingState.False);
          }
          const initiateCallEnd = () => {
            log("initiateCallEnd")
            call.close()
            notifyCallEnd();
            onCallEnd();
          }
          RequestLocalStream().then(lStream => {
            dataConn.on("close", onCallEnd); // For what case?
            //call.on('close', onClose); // Works from time to time (peerjs bug)
            const checkConnInterval = setInterval(() => {
              if (!dataConn.open) {
                initiateCallEnd();
                clearInterval(checkConnInterval);
              }
              if (!call.open) {
                onCallEnd();
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
              if (data === "call_end") {
                //console.log('receiving callend on call')
                onCallEnd();
                return;
              }
              // if (data && typeof data.video === 'boolean') {
              //   log('Recieved video toggle signal: ', data.video)
              //   callUI.toggleRemoteVideo(data.video)
              // }
              if (data && typeof data.name === 'string') {
                //console.log("name",data)
                callUI.setAssistentName(data.name);
              }
              if (data && typeof data.x === 'number' && typeof data.y === 'number') {
                mouse.move(data);
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
            onCallEnd()
          });
        }).catch(); // in case of Confirm.remove() without any confirmation
      });
    });
  }
}

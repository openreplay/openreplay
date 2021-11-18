import './_slim';
import Peer, { MediaConnection } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { App, Messages } from '@openreplay/tracker';
import type Message from '@openreplay/tracker';

import Mouse from './Mouse';
import CallWindow from './CallWindow';
import ConfirmWindow from './ConfirmWindow';


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

    let assistDemandedRestart = false;
    let peer : Peer | null = null;

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
              //console.log('OpenReplay tracker-assist: receiving callend onconfirm')
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
              //console.log("callend initiated")
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
                //console.log('receiving callend on call')
                onCallEnd();
                return;
              }
              if (data && typeof data.name === 'string') {
                //console.log("name",data)
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
            .catch(e => console.log("OpenReplay tracker-assist: cant reach media devices. ", e));
          });
        }).catch(); // in case of Confirm.remove() without any confirmation
      });
    });
  }
}

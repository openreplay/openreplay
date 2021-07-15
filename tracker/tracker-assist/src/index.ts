import Peer, { MediaConnection } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { App, Messages } from '@openreplay/tracker';
import type Message from '@openreplay/tracker';

import Mouse from './Mouse';
import CallWindow from './CallWindow';
import Confirm from './Confirm';


export interface Options {
  confirmText: string,
  confirmStyle: Object, // Styles object
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
    },
    opts,
  );
  return function(app: App | null, appOptions: { __DISABLE_SECURE_MODE?: boolean } = {}) {
    // @ts-ignore
    if (app === null || !navigator?.mediaDevices?.getUserMedia) { // 93.04% browsers
      return;
    }

    app.attachStartCallback(function() {
      // @ts-ignore
      const peerID = `${app.projectKey}-${app.getSessionID()}`
      const peer = new Peer(peerID, {
              // @ts-ignore
        host: app.getHost(),
        path: '/assist',
        port: location.protocol === 'http:' && appOptions.__DISABLE_SECURE_MODE ? 80 : 443,
      });
      console.log(peerID)
      peer.on('connection', function(conn) { 
        window.addEventListener("beforeunload", () => conn.open && conn.send("unload"));

        console.log('connection')
        conn.on('open', function() {
          
          console.log('connection open')

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
          app.stop();
          //@ts-ignore (should update tracker dependency)
          app.addCommitCallback((messages: Array<Message>): void => {
            let i = 0;
            while (i < messages.length) {
              buffer.push(messages.slice(i, i+=1000));
            }
            if (!buffering) { 
              buffering = true;
              sendNext(); 
            }
          });
          app.start();
        });
      });


      let calling: CallingState  = CallingState.False;
      peer.on('call', function(call) {
        const dataConn: DataConnection | undefined = peer
                .connections[call.peer].find(c => c.type === 'data');
        if (calling !== CallingState.False || !dataConn) {
          call.close();
          return;
        }

        calling = CallingState.Requesting;
        const notifyCallEnd = () => {
          dataConn.open && dataConn.send("call_end");
        }

        const confirm = new Confirm(options.confirmText, options.confirmStyle);
        dataConn.on('data', (data) => { // if call closed by a caller before confirm
          if (data === "call_end") {
            console.log('receiving callend onconfirm')
            calling = CallingState.False;
            confirm.remove();
          }                    
        });
        confirm.mount();
        confirm.onAnswer(agreed => {
          if (!agreed || !dataConn.open) {
            call.close();
            notifyCallEnd();
            calling = CallingState.False;
            return;
          }

          const mouse = new Mouse();
          let callUI;

          navigator.mediaDevices.getUserMedia({video:true, audio:true})
          .then(lStream => {
            const onCallEnd = () => {
              console.log("on callend", call.open)
              mouse.remove();
              callUI?.remove();
              lStream.getTracks().forEach(t => t.stop());
              calling = CallingState.False;
            }
            const initiateCallEnd = () => {
              console.log("callend initiated")
              call.close()
              notifyCallEnd();
              onCallEnd();
            }

            call.answer(lStream);

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
              dataConn.on('data', (data: any) => {
                if (data === "call_end") {
                  console.log('receiving callend on call')
                  onCallEnd();
                  return;
                }
                if (data && typeof data.name === 'string') {
                  console.log("name",data)
                  callUI.setAssistentName(data.name);
                }
                if (data && typeof data.x === 'number' && typeof data.y === 'number') {
                  mouse.move(data);
                }
              });
            });
          });
        });
      });
    });
  }
}

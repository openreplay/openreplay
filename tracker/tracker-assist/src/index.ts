import Peer, { MediaConnection } from 'peerjs';
import type { DataConnection } from 'peerjs';
import { App, Messages } from '@openreplay/tracker';
import type Message from '@openreplay/tracker';

import Mouse from './Mouse';
import CallWindow from './CallWindow';
import confirm from './confirm';


export interface Options {
  confirmText: string,
  confirmStyle: Object, // Styles object
}


export default function(opts: Partial<Options> = {})  {
  const options: Options = Object.assign(
    { 
      confirmText: "You have a call. Do you want to answer?",
      confirmStyle: {},
    },
    opts,
  );
  return function(app: App | null) {
    // @ts-ignore
    if (app === null || !navigator?.mediaDevices?.getUserMedia) { // 93.04% browsers
      return;
    }


    let callingPeerDataConn
    app.attachStartCallback(function() {
      // @ts-ignore
      const peerID = `${app.getProjectKey()}-${app.getSessionID()}`
      const peer = new Peer(peerID, {
              // @ts-ignore
        host: app.getHost(),
        path: '/assist',
        port: 80,//443,
      });
      console.log(peerID)
      peer.on('connection', function(conn) { 
        console.log('connection')
        conn.on('open', function() {
                  console.log('connection open')

          app.stop();
          //@ts-ignore (should update tracker dependency)
          app.addCommitCallback((messages: Array<Message>): void => {
            conn.send(messages);
          });
          app.start();
        });
      });
      let calling = false;
      peer.on('call', function(call) {
        const dataConn: DataConnection = peer
                .connections[call.peer].find(c => c.type === 'data');
        if (calling) {
          call.close();
          dataConn.send("call_end");
          return;
        }
        confirm(options.confirmText, options.confirmStyle).then(conf => {
          if (!conf || !dataConn.open) {
            call.close();
            dataConn.open && dataConn.send("call_end");
            return;
          }

          calling = true;
          const mouse = new Mouse();
          let callUI;

          navigator.mediaDevices.getUserMedia({video:true, audio:true})
          .then(oStream => {
            const onClose = () => {
              console.log("close call...")
              if (call.open) { call.close(); }
              mouse?.remove();
              callUI?.remove();
              oStream.getTracks().forEach(t => t.stop());

              calling = false;
              if (dataConn.open) {
                dataConn.send("call_end");
              }
            }
            dataConn?.on("close", onClose);

            call.answer(oStream);
            call.on('close', onClose); // Works from time to time (peerjs bug)
            call.on('error', onClose); // notify about error?

            callUI = new CallWindow(onClose);
            callUI.setOutputStream(oStream);
            call.on('stream', function(iStream) {
              callUI.setInputStream(iStream);
              dataConn?.on('data', (data: any) => {
                if (data === "call_end") {
                  onClose();
                  return;
                }
                if (call.open && data && typeof data.x === 'number' && typeof data.y === 'number') {
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

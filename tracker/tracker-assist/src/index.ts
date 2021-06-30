import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { App, Messages } from '@openreplay/tracker';
import type Message from '@openreplay/tracker';

import Mouse from './Mouse';
import CallWindow from './CallWindow';

export interface Options {

}


export default function(opts: Partial<Options> = {})  {
  const options: Options = Object.assign(
    { },
    opts,
  );
  return function(app: App | null) {
    // @ts-ignore
    if (app === null || !navigator?.mediaDevices?.getUserMedia) { // 93.04% browsers
      return;
    }

    app.attachStartCallback(function() {
      // @ts-ignore
      const peerID = `${app.getProjectKey()}-${app.getSessionID()}`
      const peer = new Peer(peerID, {
              // @ts-ignore
        host: app.getHost(),
        path: '/assist',
        port: 80,//443,
      });
      // peer.on('open', function(id) {
      // });
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
          //conn.send({});
          // conn.on('data', function(data) {
          //   console.log('Received', data);
          // });
        });
      });
      peer.on('call', function(call) {
        // ask client here.

        const answer = confirm("You have a call. Answer?")
        if (!answer) return;

        const mouse = new Mouse();
        let callUI;

        navigator.mediaDevices.getUserMedia({video:true, audio:true})
        .then(oStream => {
          const onClose = () => {
            console.log("close call...")
            call.close(); //?
            mouse?.remove();
            callUI?.remove();
            oStream.getTracks().forEach(t => t.stop());
          }
          call.on('close', onClose);// Doesnt' work on firefox 
   
          call.answer(oStream);
          callUI = new CallWindow(onClose);
          callUI.setOutputStream(oStream);
          call.on('stream', function(iStream) {
            callUI.setInputStream(iStream);

            Object.values(peer.connections).forEach((c: Array<DataConnection>) =>
              c[0].on('data', data => {
                mouse.move(data);
              })
            )
          });



        });

      });
    });
  }
}

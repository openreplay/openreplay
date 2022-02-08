import './_slim.js';

import type { App } from '@openreplay/tracker';
import type { Options } from './Assist.js'
import Assist from './Assist.js'


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
  return function(app: App | null, appOptions: { __DISABLE_SECURE_MODE?: boolean } = {}) {
    // @ts-ignore
    if (app === null || !navigator?.mediaDevices?.getUserMedia) { // 93.04% browsers
      return;
    }
    if (!app.checkRequiredVersion || !app.checkRequiredVersion("REQUIRED_TRACKER_VERSION")) {
      console.warn("OpenReplay Assist: couldn't load. The minimum required version of @openreplay/tracker@REQUIRED_TRACKER_VERSION is not met")
      return
    }
    app.notify.log("OpenReplay Assist initializing.")
    const assist = new Assist(app, options, appOptions.__DISABLE_SECURE_MODE)
    app.debug.log(assist)
    return assist

  }
}

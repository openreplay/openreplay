import WebPlayer from './web/WebPlayer';
import reduxStore, {update, cleanStore} from './_store';

import type { State as MMState } from './web/MessageManager'
import type { State as PState } from './player/Player'
import type { Store } from './common/types'


const myStore: Store<PState & MMState> = {
  get() {
    return reduxStore.getState()
  },
  update(s) {
    update(s)
  }
}

let instance: WebPlayer | null = null;

export function init(session, config, live = false) {
  instance = new WebPlayer(myStore, session, config, live);
}

export function clean() {
  if (instance === null) return;
  instance.clean();
  cleanStore()
  instance = null;
}

const initCheck = (method) => (...args) => {
  if (instance === null) {
    console.error("Player method called before Player have been initialized.");
    return;
  }
  return method(...args);
}

export const jump = initCheck((...args) => instance.jump(...args));
export const togglePlay = initCheck((...args) => instance.togglePlay(...args));
export const pause = initCheck((...args) => instance.pause(...args));
export const toggleSkip = initCheck((...args) => instance.toggleSkip(...args));
export const toggleSkipToIssue = initCheck((...args) => instance.toggleSkipToIssue(...args));
export const toggleAutoplay = initCheck((...args) => instance.toggleAutoplay(...args));
export const toggleSpeed = initCheck((...args) => instance.toggleSpeed(...args));
export const toggleEvents = initCheck((...args) => instance.toggleEvents(...args));
export const speedUp = initCheck((...args) => instance.speedUp(...args));
export const speedDown = initCheck((...args) => instance.speedDown(...args));
export const attach = initCheck((...args) => instance.attach(...args));
export const markElement = initCheck((...args) => instance.mark(...args));
export const scale = initCheck(() => instance.scale());
/** @type {WebPlayer.toggleTimetravel} */
export const toggleTimetravel = initCheck((...args) => instance.toggleTimetravel(...args))
export const toggleInspectorMode = initCheck((...args) => instance.toggleInspectorMode(...args));
export const markTargets = initCheck((...args) => instance.markTargets(...args))
export const activeTarget =initCheck((...args) => instance.setActiveTarget(...args))

export const jumpToLive = initCheck((...args) => instance.jumpToLive(...args))
export const toggleUserName = initCheck((...args) => instance.toggleUserName(...args))

// !not related to player, but rather to the OR platform.
export const injectNotes = () => {} // initCheck((...args) => instance.injectNotes(...args))
export const filterOutNote = () => {} //initCheck((...args) => instance.filterOutNote(...args))


/** @type {Player.assistManager.call} */
export const callPeer = initCheck((...args) => instance.assistManager.call(...args))
/** @type {Player.assistManager.setCallArgs} */
export const setCallArgs = initCheck((...args) => instance.assistManager.setCallArgs(...args))
/** @type {Player.assistManager.initiateCallEnd} */
export const initiateCallEnd = initCheck((...args) => instance.assistManager.initiateCallEnd(...args))
export const requestReleaseRemoteControl = initCheck((...args) => instance.assistManager.requestReleaseRemoteControl(...args))
export const releaseRemoteControl = initCheck((...args) => instance.assistManager.releaseRemoteControl(...args))
/** @type {Player.assistManager.toggleVideoLocalStream} */
export const toggleVideoLocalStream = initCheck((...args) => instance.assistManager.toggleVideoLocalStream(...args))
export const toggleAnnotation = initCheck((...args) => instance.assistManager.toggleAnnotation(...args))


export const Controls = {
  jump,
  togglePlay,
  pause,
  toggleSkip,
  toggleSkipToIssue,
  toggleAutoplay,
  toggleEvents,
  toggleSpeed,
  speedUp,
  speedDown,
  callPeer
}
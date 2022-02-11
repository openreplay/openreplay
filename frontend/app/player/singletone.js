import Player from './Player';
import { update, clean as cleanStore, getState } from './store';
import { clean as cleanLists } from './lists';


let instance = null;

const initCheck = method => (...args) => {
  if (instance === null) {
    console.error("Player method called before Player have been initialized.");
    return;
  }
  return method(...args);
}


let autoPlay = true;
document.addEventListener("visibilitychange", function() {
  if (instance === null) return;
  if (document.hidden) {
    const { playing } = getState();
    autoPlay = playing
    if (playing) {
      instance.pause();
    }
  } else if (autoPlay) {
    instance.play();
  }
});

export function init(session, jwt, config, live = false) {
  // const live = session.live;
  const endTime = !live && session.duration.valueOf();

  instance = new Player(session, jwt, config, live);
  update({
    initialized: true,
    live,
    livePlay: live,
    endTime, // : 0, //TODO: through initialState
    session,
  });
  
  if (!document.hidden) {
    instance.play();
  }
}

export function clean() {
  if (instance === null) return;
  instance.clean();
  cleanStore();
  cleanLists();
  instance = null;
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
export const markElement = initCheck((...args) => instance.marker && instance.marker.mark(...args));
export const scale = initCheck(() => instance.scale());
export const toggleInspectorMode = initCheck((...args) => instance.toggleInspectorMode(...args));
export const callPeer = initCheck((...args) => instance.assistManager.call(...args))
export const requestReleaseRemoteControl = initCheck((...args) => instance.assistManager.requestReleaseRemoteControl(...args))
export const markTargets = initCheck((...args) => instance.markTargets(...args))
export const activeTarget = initCheck((...args) => instance.activeTarget(...args))

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

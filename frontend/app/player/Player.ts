import { goTo as listsGoTo } from './lists';
import { update, getState } from './store';
import MessageDistributor, { INITIAL_STATE as SUPER_INITIAL_STATE, State as SuperState }  from './MessageDistributor/MessageDistributor';

const fps = 60;
const performance = window.performance || { now: Date.now.bind(Date) };
const requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  // @ts-ignore
  window.mozRequestAnimationFrame ||
  // @ts-ignore
  window.oRequestAnimationFrame ||
  // @ts-ignore
  window.msRequestAnimationFrame ||
  (callback => window.setTimeout(() => { callback(performance.now()); }, 1000 / fps));
const cancelAnimationFrame =
  window.cancelAnimationFrame ||
  // @ts-ignore
  window.mozCancelAnimationFrame ||
  window.clearTimeout;

const HIGHEST_SPEED = 16;


const SPEED_STORAGE_KEY = "__$player-speed$__";
const SKIP_STORAGE_KEY = "__$player-skip$__";
const SKIP_TO_ISSUE_STORAGE_KEY = "__$player-skip-to-issue$__";
const AUTOPLAY_STORAGE_KEY = "__$player-autoplay$__";
const SHOW_EVENTS_STORAGE_KEY = "__$player-show-events$__";
const storedSpeed: number = parseInt(localStorage.getItem(SPEED_STORAGE_KEY) || "") ;
const initialSpeed = [1,2,4,8,16].includes(storedSpeed) ? storedSpeed : 1;
const initialSkip = !!localStorage.getItem(SKIP_STORAGE_KEY);
const initialSkipToIssue = !!localStorage.getItem(SKIP_TO_ISSUE_STORAGE_KEY);
const initialAutoplay = !!localStorage.getItem(AUTOPLAY_STORAGE_KEY);
const initialShowEvents = !!localStorage.getItem(SHOW_EVENTS_STORAGE_KEY);

export const INITIAL_STATE = {
  ...SUPER_INITIAL_STATE,
  time: 0,
  playing: false,
  completed: false,
  endTime: 0,
  inspectorMode: false,
  live: false,
  livePlay: false,
} as const;


export const INITIAL_NON_RESETABLE_STATE = {
  skip: initialSkip,
  skipToIssue: initialSkipToIssue,
  autoplay: initialAutoplay,
  speed: initialSpeed,
  showEvents: initialShowEvents
}

export default class Player extends MessageDistributor {
  private _animationFrameRequestId: number = 0;

  private _setTime(time: number, index?: number) {
    update({
      time,
      completed: false,
    });
    super.move(time, index);
    listsGoTo(time, index);
  }

  private _startAnimation() {
    let prevTime = getState().time;
    let animationPrevTime = performance.now();
    
    const nextFrame = (animationCurrentTime) => {
      const { 
        speed, 
        skip,
        autoplay, 
        skipIntervals, 
        endTime, 
        live, 
        livePlay,
        disconnected,
        messagesLoading,
        cssLoading,
      } = getState();

      const diffTime = messagesLoading || cssLoading || disconnected
        ? 0
        : Math.max(animationCurrentTime - animationPrevTime, 0) * (live ? 1 : speed);

      let time = prevTime + diffTime;

      const skipInterval = skip && skipIntervals.find(si => si.contains(time));  // TODO: good skip by messages
      if (skipInterval) time = skipInterval.end;

      const fmt = super.getFirstMessageTime();
      if (time < fmt) time = fmt; // ?

      const lmt = super.getLastMessageTime();
      if (livePlay && time < lmt) time = lmt;
      if (endTime < lmt) {
        update({
          endTime: lmt,
        });
      }

      prevTime = time;
      animationPrevTime = animationCurrentTime;

      const completed = !live && time >= endTime;
      if (completed) {
        this._setTime(endTime);
        return update({
          playing: false,
          completed: true,
        });
      }

      if (live && time > endTime) {
        update({
          endTime: time,
        });
      }
      this._setTime(time);
      this._animationFrameRequestId = requestAnimationFrame(nextFrame);
    };
    this._animationFrameRequestId = requestAnimationFrame(nextFrame);
  }

  play() {
    cancelAnimationFrame(this._animationFrameRequestId);
    update({ playing: true });
    this._startAnimation();
  }

  pause() {
    cancelAnimationFrame(this._animationFrameRequestId);
    update({ playing: false })
  }

  togglePlay() {
    const { playing, completed } = getState();
    if (playing) {
      this.pause();
    } else if (completed) {
      this._setTime(0);
      this.play();
    } else {
      this.play();
    }
  }

  jump(time = getState().time, index) {
    const { live } = getState();
    if (live) return;
    
    if (getState().playing) {
      cancelAnimationFrame(this._animationFrameRequestId);
      // this._animationFrameRequestId = requestAnimationFrame(() => {
        this._setTime(time, index);
        this._startAnimation();
        update({ livePlay: time === getState().endTime });
      //});
    } else {
      //this._animationFrameRequestId = requestAnimationFrame(() => {
        this._setTime(time, index);
        update({ livePlay: time === getState().endTime });
      //});
    }
  }

  toggleSkip() {
    const skip = !getState().skip;
    localStorage.setItem(SKIP_STORAGE_KEY, `${skip}`);
    update({ skip });
  }

  toggleInspectorMode(flag, clickCallback) {
    if (typeof flag !== 'boolean') {
      const { inspectorMode } = getState();
      flag = !inspectorMode;
    }
    
    if (flag) {
      this.pause();
      update({ inspectorMode: true });
      return super.enableInspector(clickCallback);
    } else {
      super.disableInspector();
      update({ inspectorMode: false });
    }
  }

  markTargets(targets: { selector: string, count: number }[] | null) {    
    this.pause();
    this.setMarkedTargets(targets);
  }

  activeTarget(index) {
    this.setActiveTarget(index);
  }
  
  toggleSkipToIssue() {
    const skipToIssue = !getState().skipToIssue;
    localStorage.setItem(SKIP_TO_ISSUE_STORAGE_KEY, `${skipToIssue}`);
    update({ skipToIssue });
  }
  
  toggleAutoplay() {
    const autoplay = !getState().autoplay;
    localStorage.setItem(AUTOPLAY_STORAGE_KEY, `${autoplay}`);
    update({ autoplay });
  }
  
  toggleEvents() {
    const showEvents = !getState().showEvents;
    localStorage.setItem(SHOW_EVENTS_STORAGE_KEY, `${showEvents}`);
    update({ showEvents });
  }

  _updateSpeed(speed: number) {
    localStorage.setItem(SPEED_STORAGE_KEY, `${speed}`);
    update({ speed });
  }

  toggleSpeed() {
    const { speed } = getState();
    this._updateSpeed(speed < HIGHEST_SPEED ? speed * 2 : 1);
  }

  speedUp() {
    const { speed } = getState();
    this._updateSpeed(Math.min(HIGHEST_SPEED, speed * 2));
  }

  speedDown() {
    const { speed } = getState();
    this._updateSpeed(Math.max(1, speed/2));
  }

  clean() {
    this.pause();
    super.clean();
  }
}
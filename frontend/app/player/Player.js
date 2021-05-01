import { goTo as listsGoTo } from './lists';
import { update, getState } from './store';
import MessageDistributor, { INITIAL_STATE as SUPER_INITIAL_STATE }  from './MessageDistributor';

const fps = 60;
const performance = window.performance || { now: Date.now.bind(Date) };
const requestAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  (callback => window.setTimeout(() => { callback(performance.now()); }, 1000 / fps));
const cancelAnimationFrame =
  window.cancelAnimationFrame ||
  window.mozCancelAnimationFrame ||
  window.clearTimeout;

const HIGHEST_SPEED = 3;


const SPEED_STORAGE_KEY = "__$player-speed$__";
const SKIP_STORAGE_KEY = "__$player-skip$__";
const storedSpeed = +localStorage.getItem(SPEED_STORAGE_KEY);
const initialSpeed = [1,2,3].includes(storedSpeed) ? storedSpeed : 1;
const initialSkip = !!localStorage.getItem(SKIP_STORAGE_KEY);

export const INITIAL_STATE = {
  ...SUPER_INITIAL_STATE,
  time: 0,
  playing: false,
  completed: false,
  endTime: 0,
  live: false,
  livePlay: false,
}

export const INITIAL_NON_RESETABLE_STATE = {
  skip: initialSkip,
  speed: initialSpeed,
}

export default class Player extends MessageDistributor {
  _animationFrameRequestId = null;

  _setTime(time, index) {
    update({
      time,
      completed: false,
    });
    this.move(time, index);
    listsGoTo(time, index);
  }

  _startAnimation() {
    let prevTime = getState().time;
    let animationPrevTime = performance.now();
    
    const nextFrame = (animationCurrentTime) => {
      const { 
        speed, 
        skip, 
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
        : Math.max(animationCurrentTime - animationPrevTime, 0) * speed;

      let time = prevTime + diffTime;

      const skipInterval = skip && skipIntervals.find(si => si.contains(time));  // TODO: good skip by messages
      if (skipInterval) time = skipInterval.end;

      const fmt = this.getFirstMessageTime();
      if (time < fmt) time = fmt; // ?

      const lmt = this.getLastMessageTime();
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
    localStorage.setItem(SKIP_STORAGE_KEY, skip);
    update({ skip });

  }

  _updateSpeed(speed) {
    localStorage.setItem(SPEED_STORAGE_KEY, speed);
    update({ speed });
  }

  toggleSpeed() {
    const { speed } = getState();
    this._updateSpeed(speed < HIGHEST_SPEED ? speed + 1 : 1);
  }

  speedUp() {
    const { speed } = getState();
    this._updateSpeed(Math.min(HIGHEST_SPEED, speed + 1));
  }

  speedDown() {
    const { speed } = getState();
    this._updateSpeed(Math.max(1, speed - 1));
  }

  clean() {
    this.pause();
    super.clean();
  }
}
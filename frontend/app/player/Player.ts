import { goTo as listsGoTo } from './lists';
import { update, getState } from './store';
import MessageDistributor, { INITIAL_STATE as SUPER_INITIAL_STATE }  from './MessageDistributor/MessageDistributor';

const fps = 60;
const performance = window.performance || { now: Date.now.bind(Date) };
const requestAnimationFrame =
  window.requestAnimationFrame ||
  // @ts-ignore
  window.webkitRequestAnimationFrame ||
  // @ts-ignore
  window.mozRequestAnimationFrame ||
  // @ts-ignore
  window.oRequestAnimationFrame ||
  // @ts-ignore
  window.msRequestAnimationFrame ||
  ((callback: (args: any) => void) => window.setTimeout(() => { callback(performance.now()); }, 1000 / fps));
const cancelAnimationFrame =
  window.cancelAnimationFrame ||
  // @ts-ignore
  window.mozCancelAnimationFrame ||
  window.clearTimeout;

const HIGHEST_SPEED = 16;


const SPEED_STORAGE_KEY = "__$player-speed$__";
const SKIP_STORAGE_KEY = "__$player-skip$__";
const SKIP_TO_ISSUE_STORAGE_KEY = "__$session-skipToIssue$__";
const AUTOPLAY_STORAGE_KEY = "__$player-autoplay$__";
const SHOW_EVENTS_STORAGE_KEY = "__$player-show-events$__";
const storedSpeed: number = parseInt(localStorage.getItem(SPEED_STORAGE_KEY) || "") ;
const initialSpeed = [1,2,4,8,16].includes(storedSpeed) ? storedSpeed : 1;
const initialSkip = localStorage.getItem(SKIP_STORAGE_KEY) === 'true';
const initialSkipToIssue = localStorage.getItem(SKIP_TO_ISSUE_STORAGE_KEY) === 'true';
const initialAutoplay = localStorage.getItem(AUTOPLAY_STORAGE_KEY) === 'true';
const initialShowEvents = localStorage.getItem(SHOW_EVENTS_STORAGE_KEY) === 'true';

export const INITIAL_STATE = {
  ...SUPER_INITIAL_STATE,
  time: 0,
  playing: false,
  completed: false,
  endTime: 0,
  inspectorMode: false,
  live: false,
  livePlay: false,
  liveTimeTravel: false,
} as const;


export const INITIAL_NON_RESETABLE_STATE = {
  skip: initialSkip,
  skipToIssue: initialSkipToIssue,
  autoplay: initialAutoplay,
  speed: initialSpeed,
  showEvents: initialShowEvents,
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

    const nextFrame = (animationCurrentTime: number) => {
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

      const skipInterval = !live && skip && skipIntervals.find((si: Node) => si.contains(time));  // TODO: good skip by messages
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

      // throttle store updates
      // TODO: make it possible to change frame rate
      if (live && time - endTime > 100) {
        update({
          endTime: time,
          livePlay: endTime - time < 900
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

  jump(time = getState().time, index: number) {
    const { live, liveTimeTravel, endTime } = getState();
    if (live && !liveTimeTravel) return;

    if (getState().playing) {
      cancelAnimationFrame(this._animationFrameRequestId);
      // this._animationFrameRequestId = requestAnimationFrame(() => {
        this._setTime(time, index);
        this._startAnimation();
        // throttilg the redux state update from each frame to nearly half a second
        // which is better for performance and component rerenders
        update({ livePlay: Math.abs(time - endTime) < 500 });
      //});
    } else {
      //this._animationFrameRequestId = requestAnimationFrame(() => {
        this._setTime(time, index);
        update({ livePlay: Math.abs(time - endTime) < 500 });
      //});
    }
  }

  toggleSkip() {
    const skip = !getState().skip;
    localStorage.setItem(SKIP_STORAGE_KEY, `${skip}`);
    update({ skip });
  }

  toggleInspectorMode(flag: boolean, clickCallback?: (args: any) => void) {
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

  activeTarget(index: number) {
    this.setActiveTarget(index);
  }

  toggleSkipToIssue() {
    const skipToIssue = !getState().skipToIssue;
    localStorage.setItem(SKIP_TO_ISSUE_STORAGE_KEY, `${skipToIssue}`);
    update({ skipToIssue });
  }

  updateSkipToIssue() {
    const skipToIssue = localStorage.getItem(SKIP_TO_ISSUE_STORAGE_KEY) === 'true';
    update({ skipToIssue });
    return skipToIssue;
  }

  toggleAutoplay() {
    const autoplay = !getState().autoplay;
    localStorage.setItem(AUTOPLAY_STORAGE_KEY, `${autoplay}`);
    update({ autoplay });
  }

  toggleEvents(shouldShow?: boolean) {
    const showEvents = shouldShow || !getState().showEvents;
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

  async toggleTimetravel() {
    if (!getState().liveTimeTravel) {
      return await this.reloadWithUnprocessedFile()
    }
  }

  jumpToLive() {
    cancelAnimationFrame(this._animationFrameRequestId);
    this._setTime(getState().endTime);
    this._startAnimation();
    update({ livePlay: true });
  }

  toggleUserName(name?: string) {
    this.cursor.toggleUserName(name)
  }

  clean() {
    this.pause();
    super.clean();
  }
}

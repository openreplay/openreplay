import { Message } from '../web/messages';
import type { Store, Interval } from '../common/types';

export interface IMessageManager {
  onFileReadSuccess(): void;
  onFileReadFailed(e: any): void;
  onFileReadFinally(): void;
  startLoading(): void;
  resetMessageManagers(): void;
  getListsFullState(): Record<string, unknown>;
  move(t: number): any;
  distributeMessage(msg: Message): void;
  setMessagesLoading(messagesLoading: boolean): void;
  clean(): void;
  sortDomRemoveMessages: (msgs: Message[]) => void;
}

export interface SetState {
  time: number;
  playing: boolean;
  completed: boolean;
  live: boolean;
  livePlay: boolean;
  freeze: boolean;

  endTime: number;
}

export interface GetState extends SetState {
  skip: boolean;
  speed: number;
  skipIntervals: Interval[];
  ready: boolean;

  lastMessageTime: number;
}

export default class Animator {
  static INITIAL_STATE: SetState = {
    time: 0,
    playing: false,
    completed: false,
    live: false,
    livePlay: false,
    freeze: false,

    endTime: 0,
  } as const;

  private animationFrameRequestId: number = 0;

  private playRetryTimeout?: ReturnType<typeof setTimeout>;

  private freezeTimeout?: ReturnType<typeof setTimeout>;

  private destroyed = false;

  /**
   * Bumped whenever a frame loop starts or stops. move() runs synchronously inside
   * the frame handler and may pause playback (click hold), so a loop checks it is
   * still current before scheduling its next frame.
   */
  private animationGeneration = 0;

  private readonly globalJump = (time: number, silent?: boolean) =>
    this.jump(time, silent);

  constructor(
    private store: Store<GetState>,
    private mm: IMessageManager,
  ) {
    // @ts-ignore external automation hook
    window.playerJump = this.globalJump;
  }

  /** Stops the frame loop and every pending timer; the instance can't play afterwards. */
  protected destroyAnimator() {
    this.destroyed = true;
    this.pause();
    clearTimeout(this.freezeTimeout);
    // @ts-ignore
    if (window.playerJump === this.globalJump) {
      // @ts-ignore
      delete window.playerJump;
    }
  }

  private setTime(time: number) {
    this.store.update({
      time,
      completed: false,
    });
    try {
      this.mm.move(time);
    } catch (e) {
      // a failing frame must not silently stop the loop
      console.error('Player: failed to apply time', time, e);
    }
  }

  private startAnimation() {
    const generation = ++this.animationGeneration;
    let prevTime = this.store.get().time;
    let animationPrevTime = performance.now();

    const frameHandler = (animationCurrentTime: number) => {
      if (this.destroyed || generation !== this.animationGeneration) return;
      const {
        speed,
        skip,
        skipIntervals,
        endTime,
        live,
        livePlay,
        ready, // = messagesLoading || cssLoading || disconnected

        lastMessageTime,
      } = this.store.get();

      const diffTime = !ready
        ? 0
        : Math.max(animationCurrentTime - animationPrevTime, 0) *
          (live ? 1 : speed);

      let time = prevTime + diffTime;

      const skipInterval =
        skip && skipIntervals.find((si) => si.contains(time));
      if (skipInterval) time = skipInterval.end;

      if (time < 0) {
        time = 0;
      } // ?
      // const fmt = getFirstMessageTime();
      // if (time < fmt) time = fmt; // ?

      // if (livePlay && time < endTime) { time = endTime }
      // === live only
      if (livePlay && time < lastMessageTime) {
        time = lastMessageTime;
      }
      if (endTime < lastMessageTime) {
        this.store.update({
          endTime: lastMessageTime,
        });
      }
      // ===

      prevTime = time;
      animationPrevTime = animationCurrentTime;

      const completed = !live && time >= endTime;
      if (completed) {
        this.setTime(endTime);
        return this.store.update({
          playing: false,
          completed: true,
        });
      }

      // === live only
      if (live && time > endTime) {
        this.store.update({
          endTime: time,
        });
      }
      // ===

      this.setTime(time);
      if (generation !== this.animationGeneration) return;
      this.animationFrameRequestId = window.requestAnimationFrame(frameHandler);
    };
    this.animationFrameRequestId = window.requestAnimationFrame(frameHandler);
  }

  play = () => {
    clearTimeout(this.playRetryTimeout);
    if (this.destroyed) return;
    const { freeze, ready } = this.store.get();
    if (freeze) return this.pause();
    if (ready) {
      window.cancelAnimationFrame(this.animationFrameRequestId);
      this.store.update({ playing: true });
      this.startAnimation();
    } else {
      // pause() cancels this, so a pause during loading is respected
      this.playRetryTimeout = setTimeout(this.play, 250);
    }
  };

  private stopAnimation() {
    this.animationGeneration++;
    window.cancelAnimationFrame(this.animationFrameRequestId);
    clearTimeout(this.playRetryTimeout);
    this.store.update({ playing: false });
  }

  pause = () => {
    clearTimeout(this.resumeTimeout);
    this.resumeTimeout = undefined;
    this.stopAnimation();
  };

  private resumeTimeout?: ReturnType<typeof setTimeout>;

  /**
   * Briefly pause playback, then resume (used to hold on a highlighted click).
   * No-op when not currently playing so it never starts a paused/stepped replay.
   * Any explicit pause() during the hold cancels the resume.
   */
  pauseFor = (ms: number) => {
    if (!this.store.get().playing) return;
    this.stopAnimation();
    clearTimeout(this.resumeTimeout);
    this.resumeTimeout = setTimeout(() => {
      this.resumeTimeout = undefined;
      const { playing, completed } = this.store.get();
      if (!playing && !completed) this.play();
    }, ms);
  };

  freeze = () => {
    return new Promise<void>((res) => {
      const attempt = () => {
        if (this.destroyed) return res();
        if (this.store.get().ready) {
          // making sure that replay is displayed completely
          this.freezeTimeout = setTimeout(() => {
            if (this.destroyed) return res();
            this.animationGeneration++;
            window.cancelAnimationFrame(this.animationFrameRequestId);
            this.store.update({ freeze: true, playing: false });
            res();
          }, 250);
        } else {
          this.freezeTimeout = setTimeout(attempt, 250);
        }
      };
      attempt();
    });
  };

  unfreeze = (shouldPlay: boolean = true) => {
    this.store.update({ freeze: false });
    if (shouldPlay) {
      this.play();
    }
  };

  togglePlay = () => {
    const { playing, completed } = this.store.get();
    if (playing) {
      this.pause();
    } else if (completed) {
      this.setTime(0);
      this.play();
    } else {
      this.play();
    }
  };

  // jump by index?
  jump = (time: number, silent?: boolean) => {
    if (this.store.get().playing && this.store.get().ready) {
      window.cancelAnimationFrame(this.animationFrameRequestId);
      this.setTime(time);
      // setTime may have paused playback (click hold)
      if (!silent && this.store.get().playing) {
        this.startAnimation();
      }
      this.store.update({ livePlay: time === this.store.get().endTime });
    } else {
      this.setTime(time);
      this.store.update({ livePlay: time === this.store.get().endTime });
    }
  };

  jumpInterval = (interval: number) => {
    const { endTime, time } = this.store.get();

    if (interval > 0) {
      return this.jump(Math.min(endTime, time + interval));
    }
    return this.jump(Math.max(0, time + interval));
  };
}

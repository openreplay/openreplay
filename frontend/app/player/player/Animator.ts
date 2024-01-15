import {Message} from "Player/web/messages";
import type { Store, Interval } from 'Player';


const fps = 60
const performance: { now: () => number } = window.performance || { now: Date.now.bind(Date) }
const requestAnimationFrame: typeof window.requestAnimationFrame =
  window.requestAnimationFrame ||
  // @ts-ignore
  window.webkitRequestAnimationFrame ||
  // @ts-ignore
  window.mozRequestAnimationFrame ||
  // @ts-ignore
  window.oRequestAnimationFrame ||
  // @ts-ignore
  window.msRequestAnimationFrame ||
  (callback => window.setTimeout(() => { callback(performance.now()) }, 1000 / fps))
const cancelAnimationFrame =
  window.cancelAnimationFrame ||
  // @ts-ignore
  window.mozCancelAnimationFrame ||
  window.clearTimeout

export interface IMessageManager {
  onFileReadSuccess(): void;
  onFileReadFailed(e: any): void;
  onFileReadFinally(): void;
  startLoading(): void;
  resetMessageManagers(): void;
  getListsFullState(): Record<string, unknown>
  move(t: number): any;
  distributeMessage(msg: Message): void;
  setMessagesLoading(messagesLoading: boolean): void;
  clean(): void;
  sortDomRemoveMessages: (msgs: Message[]) => void;
}

export interface SetState {
  time: number
  playing: boolean
  completed: boolean
  live: boolean
  livePlay: boolean
  freeze: boolean

  endTime: number
}

export interface GetState extends SetState {
  skip: boolean
  speed: number
  skipIntervals: Interval[]
  ready: boolean

  lastMessageTime: number
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
  } as const

  private animationFrameRequestId: number = 0

  constructor(private store: Store<GetState>, private mm: IMessageManager) {

    // @ts-ignore
    window.playerJump = this.jump.bind(this)
  }

  private setTime(time: number) {
    this.store.update({
      time,
      completed: false,
    })
    this.mm.move(time)
  }

  private startAnimation() {
    let prevTime = this.store.get().time
    let animationPrevTime = performance.now()

    const frameHandler = (animationCurrentTime: number) => {
      const {
        speed,
        skip,
        skipIntervals,
        endTime,
        live,
        livePlay,
        ready,  // = messagesLoading || cssLoading || disconnected

        lastMessageTime,
      } = this.store.get()

      const diffTime = !ready
        ? 0
        : Math.max(animationCurrentTime - animationPrevTime, 0) * (live ? 1 : speed)

      let time = prevTime + diffTime

      const skipInterval = skip && skipIntervals.find(si => si.contains(time))
      if (skipInterval) time = skipInterval.end

      if (time < 0) { time = 0 } // ?
      //const fmt = getFirstMessageTime();
      //if (time < fmt) time = fmt; // ?

      // if (livePlay && time < endTime) { time = endTime }
      // === live only
      if (livePlay && time < lastMessageTime) { time = lastMessageTime }
      if (endTime < lastMessageTime) {
        this.store.update({
          endTime: lastMessageTime,
        })
      }
      // ===

      prevTime = time
      animationPrevTime = animationCurrentTime

      const completed = !live && time >= endTime
      if (completed) {
        this.setTime(endTime)
        return this.store.update({
          playing: false,
          completed: true,
        })
      }

      // === live only
      if (live && time > endTime) {
        this.store.update({
          endTime: time,
        })
      }
      // ===

      this.setTime(time)
      this.animationFrameRequestId = requestAnimationFrame(frameHandler)
    }
    this.animationFrameRequestId = requestAnimationFrame(frameHandler)
  }

  play() {
    if (this.store.get().freeze) return this.pause()
    if (this.store.get().ready) {
      cancelAnimationFrame(this.animationFrameRequestId)
      this.store.update({ playing: true })
      this.startAnimation()
    } else {
      setTimeout(() => {
        this.play()
      }, 250)
    }
  }

  pause() {
    cancelAnimationFrame(this.animationFrameRequestId)
    this.store.update({ playing: false })
  }

  freeze() {
    return new Promise<void>(res => {
      if (this.store.get().ready) {
        // making sure that replay is displayed completely
        setTimeout(() => {
          this.store.update({ freeze: true })
          this.pause()
          res()
        }, 250)
      } else {
        setTimeout(() => res(this.freeze()), 500)
      }
    })
  }

  togglePlay = () => {
    const { playing, completed } = this.store.get()
    if (playing) {
      this.pause()
    } else if (completed) {
      this.setTime(0)
      this.play()
    } else {
      this.play()
    }
  }

  // jump by index?
  jump = (time: number) => {
    if (this.store.get().playing) {
      cancelAnimationFrame(this.animationFrameRequestId)
      this.setTime(time)
      this.startAnimation()
      this.store.update({ livePlay: time === this.store.get().endTime })
    } else {
      this.setTime(time)
      this.store.update({ livePlay: time === this.store.get().endTime })
    }
  }

  jumpInterval(interval: number) {
    const { endTime, time } = this.store.get()

    if (interval > 0) {
      return this.jump(
        Math.min(
          endTime,
          time + interval
        )
      );
    } else {
      return this.jump(
        Math.max(
          0,
          time + interval
        )
      );
    }
  }
}

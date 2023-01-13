import type { Store, Moveable, Interval } from '../common/types';

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


export interface SetState {
  time: number
  playing: boolean
  completed: boolean
  live: boolean
  livePlay: boolean

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

    endTime: 0,
  } as const

  private animationFrameRequestId: number = 0

  constructor(private store: Store<GetState>, private mm: Moveable) {}

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
    cancelAnimationFrame(this.animationFrameRequestId)
    this.store.update({ playing: true })
    this.startAnimation()
  }

  pause() {
    cancelAnimationFrame(this.animationFrameRequestId)
    this.store.update({ playing: false })
  }

  togglePlay() {
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

  // TODO: clearify logic of live time-travel
  jumpToLive = () => {
    cancelAnimationFrame(this.animationFrameRequestId)
    this.setTime(this.store.get().endTime)
    this.startAnimation()
    this.store.update({ livePlay: true })
  }


}

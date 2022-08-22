import App from './index.js'

type Callback = () => void
function wrap(callback: Callback, n: number): Callback {
  let t = 0
  return (): void => {
    if (t++ >= n) {
      t = 0
      callback()
    }
  }
}

export default class Ticker {
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly callbacks: Array<Callback | undefined>
  constructor(private readonly app: App) {
    this.callbacks = []
  }

  attach(callback: Callback, n = 0, useSafe = true, thisArg?: any) {
    if (thisArg) {
      callback = callback.bind(thisArg)
    }
    if (useSafe) {
      callback = this.app.safe(callback)
    }
    this.callbacks.unshift(n ? wrap(callback, n) : callback) - 1
  }

  start(): void {
    if (this.timer === null) {
      this.timer = setInterval(
        () =>
          this.callbacks.forEach((cb) => {
            if (cb) cb()
          }),
        30,
      )
    }
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

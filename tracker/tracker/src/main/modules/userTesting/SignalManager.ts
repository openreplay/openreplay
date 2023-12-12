import { TEST_START, TASK_IND, SESSION_ID } from './utils.js'

export default class SignalManager {
  private readonly durations = {
    testStart: 0,
    tasks: [] as unknown as {
      taskId: number
      started: number
    }[],
  }

  constructor(
    private readonly ingestPoint: string,
    private readonly getTimestamp: () => number,
    private readonly token: string,
    private readonly testId: number,
    private readonly storageKey: string,
    private readonly setStorageKey: (key: string, value: string) => void,
    private readonly removeStorageKey: (key: string) => void,
    private readonly getStorageKey: (key: string) => string | null,
    private readonly getSessionId: () => string | undefined,
  ) {
    const possibleStart = this.getStorageKey(TEST_START)
    if (possibleStart) {
      this.durations.testStart = parseInt(possibleStart, 10)
    }
  }

  getDurations = () => {
    return this.durations
  }

  setDurations = (durations: {
    testStart: number
    tasks: {
      taskId: number
      started: number
    }[]
  }) => {
    this.durations.testStart = durations.testStart
    this.durations.tasks = durations.tasks
  }

  signalTask = (taskId: number, status: 'begin' | 'done' | 'skipped', taskAnswer?: string) => {
    if (!taskId) return console.error('User Testing: No Task ID Given')
    const taskStart = this.durations.tasks.find((t) => t.taskId === taskId)
    const timestamp = this.getTimestamp()
    const duration = taskStart ? timestamp - taskStart.started : 0
    return fetch(`${this.ingestPoint}/v1/web/uxt/signals/task`, {
      method: 'POST',
      headers: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        testId: this.testId,
        taskId,
        status,
        duration,
        timestamp,
        taskAnswer,
      }),
    })
  }

  signalTest = (status: 'begin' | 'done' | 'skipped') => {
    const timestamp = this.getTimestamp()
    if (status === 'begin' && this.testId) {
      const sessionId = this.getSessionId()
      this.setStorageKey(SESSION_ID, sessionId as unknown as string)
      this.setStorageKey(this.storageKey, this.testId.toString())
      this.setStorageKey(TEST_START, timestamp.toString())
    } else {
      this.removeStorageKey(this.storageKey)
      this.removeStorageKey(TASK_IND)
      this.removeStorageKey(TEST_START)
    }
    const start = this.durations.testStart || timestamp
    const duration = timestamp - start

    return fetch(`${this.ingestPoint}/v1/web/uxt/signals/test`, {
      method: 'POST',
      headers: {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        testId: this.testId,
        status,
        duration,
        timestamp,
      }),
    })
  }
}

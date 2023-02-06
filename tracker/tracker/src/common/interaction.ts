import Message from './messages.gen.js'

export interface Options {
  connAttemptCount?: number
  connAttemptGap?: number
}

type Start = {
  type: 'start'
  ingestPoint: string
  pageNo: number
  timestamp: number
  url: string
} & Options

type Auth = {
  type: 'auth'
  token: string
  beaconSizeLimit?: number
}

export type ToWorkerData = null | 'stop' | Start | Auth | Array<Message>

type Failure = {
  type: 'failure'
  reason: string
}

export type FromWorkerData = 'restart' | Failure

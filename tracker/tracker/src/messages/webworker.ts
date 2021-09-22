// TODO: "common" folder instead of "messages". (better file structure)
export interface Options {
  connAttemptCount?: number;
  connAttemptGap?: number;
  beaconSize?: number;
}

type Settings = {
  ingestPoint?: string;
  token?: string;
  pageNo?: number;
  startTimestamp?: number;
  timeAdjustment?: number;
  beaconSizeLimit?: number;
} & Partial<Options>;

export type WorkerMessageData = null | "stop" | Settings | Array<{ _id: number }>;
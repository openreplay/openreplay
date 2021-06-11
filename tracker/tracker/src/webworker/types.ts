export interface Options {
  connAttemptCount?: number;
  connAttemptGap?: number;
}

type Settings = {
  ingestPoint?: string;
  token?: string;
  pageNo?: number;
  startTimestamp?: number;
  timeAdjustment?: number;
} & Partial<Options>;

export type MessageData = null | "stop" | Settings | Array<{ _id: number }>;
import { LongAnimationTask } from "../messages";

export interface ILongAnimationTask {
  name: string;
  duration: number;
  blockingDuration: number;
  firstUIEventTimestamp: number;
  startTime: number;
  time: number;
  scripts: [
    {
      name: string;
      duration: number;
      invoker: string;
      invokerType: string;
      pauseDuration: number;
      sourceURL: string;
      sourceFunctionName: string;
      sourceCharPosition: number;
      forcedStyleAndLayoutDuration: number;
    },
  ];
  isRed: boolean;
  key: string;
}
const ID_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function shortId(len = 6) {
  const bytes = new Uint8Array(len);
  if (globalThis.crypto?.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i++) bytes[i] = (Math.random() * 256) | 0;
  }

  let out = '';
  for (let i = 0; i < len; i++) out += ID_CHARS[bytes[i] % 62];
  return out;
}

export const getLongTask = (msg: LongAnimationTask): ILongAnimationTask => {
  let scripts = []
  try {
    scripts = JSON.parse(msg.scripts)
  } catch (e) {
    console.error('Error parsing scripts for LAT:', e, msg)
  }
  return ({
    name: msg.name,
    duration: msg.duration,
    blockingDuration: msg.blockingDuration,
    firstUIEventTimestamp: msg.firstUIEventTimestamp,
    startTime: msg.startTime,
    scripts,
    isRed: msg.blockingDuration > 50,
    time: msg.startTime,
    key: shortId(),
  });
}

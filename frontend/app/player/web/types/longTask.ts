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
  });
}

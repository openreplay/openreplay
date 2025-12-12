export interface LongAnimationTask {
  name: string;
  duration: number;
  blockingDuration: number;
  firstUIEventTimestamp: number;
  startTime: number;
  time?: number;
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
  key: string;
}

import type App from '../app/index.js'
import { LongAnimationTask } from "../app/messages.gen";

export interface LongAnimationTask extends PerformanceEntry {
  name: string;
  duration: number;
  blockingDuration: number;
  firstUIEventTimestamp: number;
  startTime: number;
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
}

export interface LATOptions {
  longTasks: boolean;
}

export default function (app: App, opts: Partial<LATOptions>): void {
  if (!opts.longTasks || !('PerformanceObserver' in window) || !('LongTaskObserver' in window)) {
    return;
  }
  const onEntry = (entry: LongAnimationTask) => {
    app.send(LongAnimationTask(
      entry.name,
      entry.duration,
      entry.blockingDuration,
      entry.firstUIEventTimestamp,
      entry.startTime,
      JSON.stringify(entry.scripts ?? []),
    ))
  }
  const observer = new PerformanceObserver((entryList) => {
    entryList.getEntries().forEach((entry) => {
      if (entry.entryType === 'long-animation-frame') {
        onEntry(entry as LongAnimationTask)
      }
    })
  })
  app.attachStartCallback(() => {
    performance.getEntriesByType('long-animation-frame').forEach((lat: LongAnimationTask) => {
      onEntry(lat)
    })
    observer.observe({
      entryTypes: ['long-animation-frame'],
    })
  })
  app.attachStopCallback(() => {
    observer.disconnect()
  })
}
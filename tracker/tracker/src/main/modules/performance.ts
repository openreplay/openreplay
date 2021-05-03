import App from '../app';
import { IN_BROWSER } from '../utils';
import { PerformanceTrack } from '../../messages';

const perf: {
  memory: {
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
  };
} = IN_BROWSER && 'memory' in performance ? performance : { memory: {} };

export const deviceMemory = IN_BROWSER ? ((navigator as any).deviceMemory || 0) * 1024 : 0;
export const jsHeapSizeLimit = perf.memory.jsHeapSizeLimit || 0;

export default function (app: App): void {
  let frames: number | undefined;
  let ticks: number | undefined;

  const nextFrame = (): void => {
    if (frames === undefined || frames === -1) {
      return;
    }
    frames++;
    requestAnimationFrame(nextFrame);
  };

  app.ticker.attach(
    (): void => {
      if (ticks === undefined || ticks === -1) {
        return;
      }
      ticks++;
    },
    0,
    false,
  );

  const sendPerformanceTrack = (): void => {
    if (frames === undefined || ticks === undefined) {
      return;
    }
    app.send(new 
      PerformanceTrack(
        frames,
        ticks,
        perf.memory.totalJSHeapSize || 0,
        perf.memory.usedJSHeapSize || 0,
      ),
    );
    ticks = frames = document.hidden ? -1 : 0;
  };

  app.attachStartCallback((): void => {
    ticks = frames = -1;
    sendPerformanceTrack();
    nextFrame();
  });

  app.attachStopCallback((): void => {
    ticks = frames = undefined;
  });

  app.ticker.attach(sendPerformanceTrack, 40, false);

  if (document.hidden !== undefined) {
    app.attachEventListener(
      document,
      'visibilitychange',
      sendPerformanceTrack as EventListener,
      false,
      false,
    );
  }
}

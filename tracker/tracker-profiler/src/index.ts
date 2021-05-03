import { App, Messages } from '@openreplay/tracker';

export default function() {
  return (app: App | null) => {
    if (app === null) {
      return (name: string) => (fn: Function, thisArg?: any) =>
        thisArg === undefined ? fn : fn.bind(thisArg);
    }
    return (name: string) => (fn: Function, thisArg?: any) => (
      ...args: any[]
    ) => {
      const startTime = performance.now();
      const result =
        thisArg === undefined ? fn.apply(this, args) : fn.apply(thisArg, args);
      const duration = performance.now() - startTime;
      app.send(
        Messages.Profiler(
          name,
          duration,
          args.map(String).join(', '),
          String(result),
        ),
      );
      return result;
    };
  };
}

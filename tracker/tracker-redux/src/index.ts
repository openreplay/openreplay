import { App, Messages } from '@openreplay/tracker';
import { Encoder, murmur } from './syncod-v2/index.js';

export interface Options {
  actionFilter: (action: any) => boolean;
  actionTransformer: (action: any) => any; // null will be ignored
  actionType: (action: any) => any; // empty string and non-string will be ignored
  stateTransformer: (state: any) => any;
  stateUpdateBatching: {
    enabled: boolean;
    throttle: number;
  }
}

export default function(opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      actionFilter: () => true,
      actionTransformer: action => action,
      actionType: action => action.type,
      stateTransformer: state => state,
      stateUpdateBatching: {
        enabled: true,
        throttle: 50,
      }
    },
    opts,
  );
  return (app: App | null) => {
    if (app === null) {
      return () => next => action => next(action);
    }
    const encoder = new Encoder(murmur, 50);
    app.attachStopCallback(() => {
      encoder.clear()
    })

    let lastCommit: number;
    let lastState: string | null = null;

    const batchEncoding = (state: Record<string, any>) => {
      if (!lastState || !lastCommit || Date.now() - lastCommit > options.stateUpdateBatching.throttle) {
        const _state = encoder.encode(options.stateTransformer(state));
        lastCommit = Date.now();
        lastState = _state;
        return _state;
      } else {
        return lastState
      }
    }
    return ({ getState }) => next => action => {
      if (!app.active() || !options.actionFilter(action)) {
        return next(action);
      }
      const startTime = performance.now();
      const result = next(action);
      const duration = performance.now() - startTime;
      try {
        const type = options.actionType(action);
        if (typeof type === 'string' && type) {
          app.send(Messages.StateAction(type));
        }
        const _action = encoder.encode(options.actionTransformer(action));
        let _currState: string
        if (options.stateUpdateBatching.enabled) {
          _currState = batchEncoding(getState());
        } else {
          _currState = encoder.encode(options.stateTransformer(getState()));
        }
        const _table = encoder.commit();
        for (let key in _table) app.send(Messages.OTable(key, _table[key]));
        app.send(Messages.Redux(_action, _currState, duration));
      } catch {
        encoder.clear();
      }
      return result;
    };
  };
}

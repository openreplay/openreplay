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
    const worker = new Worker(
      URL.createObjectURL(new Blob(['WEBWORKER_BODY'], { type: 'text/javascript' })),
    );
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
      const actionTs = app?.timestamp() ?? 0
      worker.postMessage({
        type: 'action',
        action: options.actionTransformer(action),
        state: options.stateTransformer(getState()),
        timestamp: actionTs,
      })
      worker.onmessage = ({ data }) => {
        if (data.type === 'encoded') {
          const _action = data.action;
          const _currState = data.state;
          const _table = data.table;
          const _timestamp = data.timestamp;
          for (let key in _table) app.send(Messages.OTable(key, _table[key]));
          app.send(Messages.Redux(_action, _currState, duration, _timestamp));
        }
      }
      worker.onerror = (e) => {
        console.error('OR Redux: worker_error', e)
      }
      const type = options.actionType(action);
      if (typeof type === 'string' && type) {
        app.send(Messages.StateAction(type));
      }
      return result;
    };
  };
}

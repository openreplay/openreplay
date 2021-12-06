import { App, Messages } from '@openreplay/tracker';
import { Encoder, sha1 } from './syncod/index.js';

export interface Options {
  actionFilter: (action: any) => boolean;
  actionTransformer: (action: any) => any; // null will be ignored
  actionType: (action: any) => any; // empty string and non-string will be ignored
  stateTransformer: (state: any) => any;
}

export default function(opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      actionFilter: () => true,
      actionTransformer: action => action,
      actionType: action => action.type,
      stateTransformer: state => state,
    },
    opts,
  );
  return (app: App | null) => {
    if (app === null) {
      return reducer => (state, action) => reducer(state, action);
    }
    const encoder = new Encoder(sha1, 50);
    return reducer => (state, action) => {
      if (!options.actionFilter(action)) {
        return reducer(state, action);
      }
      const startTime = performance.now();
      state = reducer(state, action);
      const duration = performance.now() - startTime;
      try {
        const type = options.actionType(action);
        if (typeof type === 'string' && type) {
          app.send(Messages.StateAction(type));
        }
        const _action = encoder.encode(options.actionTransformer(action));
        const _state = encoder.encode(options.stateTransformer(state));
        const _table = encoder.commit();
        for (let key in _table) app.send(Messages.OTable(key, _table[key]));
        app.send(Messages.NgRx(_action, _state, duration));
      } catch {
        encoder.clear();
      }
      return state;
    };
  };
}

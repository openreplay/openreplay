import { App, Messages } from "@openreplay/tracker";
import { Encoder, sha1 } from "./syncod/index.js";

export interface Options {
  filter: (mutation: any, state: any) => boolean;
  transformer: (state: any) => any;
  mutationTransformer: (mutation: any) => any;
}

function processMutationAndState(
  app: App,
  options: Options,
  encoder: Encoder,
  mutation: string[],
  state: Record<string, any>
) {
  if (options.filter(mutation, state)) {
    try {
      const _mutation = encoder.encode(options.mutationTransformer(mutation));
      const _state = encoder.encode(options.transformer(state));
      const _table = encoder.commit();
      for (let key in _table) app.send(Messages.OTable(key, _table[key]));
      app.send(Messages.Zustand(_mutation, _state));
    } catch (e) {
      encoder.clear();
      app.debug.error(e)
    }
  }
}

export default function(opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      filter: () => true,
      transformer: state => state,
      mutationTransformer: mutation => mutation,
    },
    opts
  );
  return (app: App | null) => {
    if (app === null) {
      return Function.prototype;
    }
    const encoder = new Encoder(sha1, 50);
    const state = {};
    return (storeName: string = Math.random().toString(36).substring(2, 9)) =>
    (config: Function) =>
      (set: (...args: any) => void, get: () => Record<string, any>, api: any) =>
      config(
        (...args) => {
          set(...args)
          const newState = get();
          state[storeName] = newState
          const triggeredActions = args.map(action => action.toString?.())

          processMutationAndState(app, options, encoder, triggeredActions, state)
        },
        get,
        api
      )
  };
}

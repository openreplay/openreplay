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
  mutation: any,
  state: any
) {
  if (options.filter(mutation, state)) {
    try {
      const { type } = mutation;
      if (typeof type === "string" && type) {
        app.send(Messages.StateAction(type));
      }
      const _mutation = encoder.encode(options.mutationTransformer(mutation));
      const _state = encoder.encode(options.transformer(state));
      const _table = encoder.commit();
      for (let key in _table) app.send(Messages.OTable(key, _table[key]));
      app.send(Messages.Vuex(_mutation, _state));
    } catch {
      encoder.clear();
    }
  }
}

export default function(opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      filter: () => true,
      transformer: state => state,
      mutationTransformer: mutation => mutation
    },
    opts
  );
  return (app: App | null) => {
    if (app === null) {
      return Function.prototype;
    }
    const encoder = new Encoder(sha1, 50);
    return store => {
      // Vuex
      if (store.subscribe) {
        store.subscribe((mutation, state) => {
          processMutationAndState(app, options, encoder, mutation, state);
        });
      }
      // Pinia
      if (store.$onAction) {
        store.$onAction(({ name, store, args }) => {
          try {
            let state = {};
            state[store.$id] = store.$state;
            const mutation = {
              type: name,
              payload: JSON.parse(JSON.stringify(args))
            };
            processMutationAndState(app, options, encoder, mutation, state);
          } catch {}
        });
      }
    };
  };
}
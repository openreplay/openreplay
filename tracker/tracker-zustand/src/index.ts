import { App, Messages } from "@openreplay/tracker";
import { Encoder, murmur } from "./syncod-v2/index.js";
import { StateCreator, StoreMutatorIdentifier } from "zustand";

export type StateLogger = <
  T extends unknown,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, Mps, Mcs>,
  name?: string
) => StateCreator<T, Mps, Mcs>;

type LoggerImpl = <T extends unknown>(
  f: StateCreator<T, [], []>,
  name?: string
) => StateCreator<T, [], []>;

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
      app.debug.error(e);
    }
  }
}

const createZustandTracker = (opts: Partial<Options> = {}) => {
  const options: Options = Object.assign(
    {
      filter: () => true,
      transformer: state => state,
      mutationTransformer: mutation => mutation
    },
    opts
  );
  return (app: App | null): LoggerImpl => {
    if (app === null) {
      return f => (set, get, api) => f(set, get, api);
    }
    const encoder = new Encoder(murmur, 50);
    const state = {};

    return (
      f,
      name = Math.random()
        .toString(36)
        .substring(2, 9)
    ) => (set, get, api) => {
      const loggedSet: typeof set = (...args) => {
        set(...args);
        state[name] = get();
        processMutationAndState(
          app,
          options,
          encoder,
          args.map(a => (a ? a.toString?.() ?? "" : "")),
          state
        );
      };
      return f(loggedSet, get, api);
    };
  };
};

export default createZustandTracker;

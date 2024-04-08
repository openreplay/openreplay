import { Encoder, murmur } from '../syncod-v2/index.js';

type FromWorker = {
  type: 'encoded';
  action: string;
  state: string;
  table: Record<string, any>;
  timestamp: number;
};
type ToWorker = {
  type: 'action';
  action: Record<string, any>;
  state: Record<string, any>;
  timestamp: number;
};

declare function postMessage(message: FromWorker): void;

const encoder = new Encoder(murmur, 50);
const options = {
  stateUpdateBatching: {
    enabled: true,
    throttle: 50,
  },
};
let lastCommit: number;
let lastState: string | null = null;

const batchEncoding = (state: Record<string, any>) => {
  if (
    !lastState ||
    !lastCommit ||
    Date.now() - lastCommit > options.stateUpdateBatching.throttle
  ) {
    const _state = encoder.encode(state);
    lastCommit = Date.now();
    lastState = _state;
    return _state;
  } else {
    return lastState;
  }
};

// @ts-ignore
self.onmessage = ({ data }: ToWorker) => {
  switch (data.type) {
    case 'action': {
      try {
        const _action = encoder.encode(data.action);
        let _currState: string;
        if (options.stateUpdateBatching.enabled) {
          _currState = batchEncoding(data.state);
        } else {
          _currState = encoder.encode(data.state);
        }
        const _table = encoder.commit();

        postMessage({
          type: 'encoded',
          action: _action,
          state: _currState,
          table: _table,
          timestamp: data.timestamp,
        });
      } catch {
        encoder.clear();
      }
    }
  }
};

import { App, Messages } from '@openreplay/tracker';

import log from './log.js';
import { Encoder, sha1 } from './syncod/index.js';

export interface Options {
  predicate: (ev: { type: string; name: string; object: any; debugObjectName: string }) => boolean;
  sanitize: (ev: { state: any; type: string; property: string }) => { state: any; type: string; property: string };
  update: boolean;
  delete: boolean;
  add: boolean;
}

export default function (opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      predicate: () => true,
      sanitize: (ev) => ev,
      update: true,
      delete: true,
      add: true,
    },
    opts,
  );
  return (app: App | null) => {
    if (app === null) {
      return;
    }
    const encoder = new Encoder(sha1, 50);

    return (ev: { type: string; name: string; object: any; debugObjectName: string }) => {
      if (!options.predicate(ev)) return;
      const { type } = ev;
      const event = options[type] && log[type] && log[type](ev);
      if (!event) return;
      const sanitizedEvent = options.sanitize(event);
      const evType = ev.debugObjectName?.split('@')[0] || ev.type;
      if (evType) {
        app.send(Messages.StateAction(evType));
      }

      const payload = encoder.encode(sanitizedEvent);
      const table = encoder.commit();

      for (let key in table) app.send(Messages.OTable(key, table[key]));
      app.send(Messages.MobX(evType, payload));
    }
  };
}

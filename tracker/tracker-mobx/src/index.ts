import { observe } from 'mobx';
import { App, Messages } from '@openreplay/tracker';

import log from './log';
import { Encoder, sha1 } from './syncod';

export interface Options {
  predicate: (ev: any) => boolean;
  update: boolean;
  add: boolean;
  delete: boolean;
}

export default function (opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      predicate: () => true,
      update: true,
      add: true,
      delete: true,
    },
    opts,
  );
  return (app: App | null) => {
    if (app === null) {
      return;
    }
    const encoder = new Encoder(sha1, 50);

    return (target) =>
      observe(
        target,
        app.safe((ev) => {
          if (!options.predicate(ev)) return;
          const { type } = ev;
          const event = options[type] && log[type] && log[type](ev);
          if (!event) return;
          if (event.type) {
            app.send(Messages.StateAction(ev.type));
          }

          const payload = encoder.encode(ev);
          const table = encoder.commit();
          for (let key in table) app.send(Messages.OTable(key, table[key]));
          app.send(Messages.MobX(type, payload));
        }),
      );
  };
}

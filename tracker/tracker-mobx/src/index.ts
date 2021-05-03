import { spy } from 'mobx';
import { App, Messages } from '@openreplay/tracker';

import log from './log';
import { Encoder, sha1 } from './syncod';

export interface Options {
  predicate: (ev: any) => boolean,
  action: boolean;
  reaction: boolean;
  transaction: boolean;
  compute: boolean;
}

export default function(opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      predicate: () => true,
      action: true,
      reaction: true,
      transaction: true,
      compute: true,
    },
    opts,
  );
  return (app: App | null) => {
    if (app === null) {
      return;
    }
    const encoder = new Encoder(sha1, 50);
    spy(app.safe(ev => {
        if (!options.predicate(ev)) return;
        const { type } = ev;
        ev = options[type] && log[type] && log[type](ev);
        if (!ev) return;
        if (typeof ev.name === 'string' && ev.name) {
          app.send(Messages.StateAction(ev.name));
        }

        const payload = encoder.encode(ev);
        const table = encoder.commit();
        for (let key in table) app.send(Messages.OTable(key, table[key]));
        app.send(Messages.MobX(type, payload));
      }),
    );
  };
}

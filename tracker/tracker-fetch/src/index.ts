import { App, Messages } from '@openreplay/tracker';

export interface Options {
  sessionTokenHeader?: string;
  failuresOnly?: boolean;
}

export default function(opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      failuresOnly: false,
    },
    opts,
  );

  return (app: App | null) => {
    if (app === null) {
      return window.fetch;
    }

    return async (input: RequestInfo, init: RequestInit = {}) => {
      if (typeof input !== 'string') {
        return window.fetch(input, init);
      }
      if (options.sessionTokenHeader) {
        const sessionToken = app.getSessionToken();
        if (sessionToken) {
          if (init.headers === undefined) {
            init.headers = {};
          }
          if (init.headers instanceof Headers) {
            init.headers.append(options.sessionTokenHeader, sessionToken);
          } else if (Array.isArray(init.headers)) {
            init.headers.push([options.sessionTokenHeader, sessionToken]);
          } else {
            init.headers[options.sessionTokenHeader] = sessionToken;
          }
        }
      }
      const startTime = performance.now();
      const response = await window.fetch(input, init);
      const duration = performance.now() - startTime;
      if (options.failuresOnly && response.status < 400) {
        return response
      }
      const r = response.clone();
      r.text().then(text =>
        app.send(
          Messages.Fetch(
            typeof init.method === 'string' ? init.method : 'GET',
            input,
            typeof init.body === 'string' ? init.body : '',
            text,
            r.status,
            startTime + performance.timing.navigationStart,
            duration,
          ),
        ),
      );
      return response;
    };
  };
}

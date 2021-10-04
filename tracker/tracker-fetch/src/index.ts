import { App, Messages } from '@openreplay/tracker';

export interface Options {
  sessionTokenHeader?: string;
  replaceDefault: boolean; // overrideDefault ?
  failuresOnly: boolean;
  ignoreHeaders: Array<string> | boolean;
}

export default function(opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      replaceDefault: false,
      failuresOnly: false,
      ignoreHeaders: [ 'Cookie', 'Set-Cookie', 'Authorization' ],
    },
    opts,
  );

  return (app: App | null) => {
    if (app === null) {
      return window.fetch;
    }

    const ihOpt = options.ignoreHeaders
    const isHIgnoring = Array.isArray(ihOpt)
      ? name => ihOpt.includes(name)
      : () => ihOpt

    const fetch = async (input: RequestInfo, init: RequestInit = {}) => {
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

      r.text().then(text => {
        const reqHs: Record<string, string> = {}
        const resHs: Record<string, string> = {}
        if (ihOpt !== true) {
          function writeReqHeader([n, v]) {
            if (!isHIgnoring(n)) { reqHs[n] = v }
          }
          if (init.headers instanceof Headers) {
            init.headers.forEach((v, n) => writeReqHeader([n, v]))
          } else if (Array.isArray(init.headers)) {
            init.headers.forEach(writeReqHeader);
          } else if (typeof init.headers === 'object') {
            Object.entries(init.headers).forEach(writeReqHeader)
          }

          r.headers.forEach((v, n) => { if (!isHIgnoring(n)) resHs[n] = v })
        }
        const req = JSON.stringify({
          headers: reqHs,
          body: typeof init.body === 'string' ? init.body : '',
        })
        const res = JSON.stringify({
          headers: resHs,
          body: text,
        })
        app.send(
          Messages.Fetch(
            typeof init.method === 'string' ? init.method.toUpperCase() : 'GET',
            input,
            req,
            res,
            r.status,
            startTime + performance.timing.navigationStart,
            duration,
          ),
        ) 
      });
      return response;
    };
    if (options.replaceDefault) {
      window.fetch = fetch
    }
    return fetch;
  };

}

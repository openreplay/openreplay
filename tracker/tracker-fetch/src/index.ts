import { App, Messages } from '@openreplay/tracker';

interface Request {
  url: string,
  body: string | Object,
  headers: Record<string, string>,
}

interface Response {
  url: string,
  status: number,
  body: string,
  headers: Record<string, string>,
}

export interface Options {
  sessionTokenHeader?: string;
  replaceDefault: boolean; // overrideDefault ?
  failuresOnly: boolean;
  ignoreHeaders: Array<string> | boolean;
  requestSanitizer: ((Request) => Request | null) | null;
  responseSanitizer: ((Response) => Response | null) | null;
}

export default function(opts: Partial<Options> = {}) {
  const options: Options = Object.assign(
    {
      replaceDefault: false,
      failuresOnly: false,
      ignoreHeaders: [ 'Cookie', 'Set-Cookie', 'Authorization' ],
      requestSanitizer: null,
      responseSanitizer: null,
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
        // Headers prepearing
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

        // Request forming
        let reqBody = ''
        if (typeof init.body === 'string') {
          reqBody = init.body
        } else if (typeof init.body === 'object') {
          try {
            reqBody = JSON.stringify(init.body)
          } catch {}
        }
        let req: Request | null = {
          url: input,
          headers: reqHs,
          body: reqBody,
        }
        if (options.requestSanitizer !== null) {
          req = options.requestSanitizer(req)
          if (!req) {
            return
          }
        }

        // Response forming
        let res: Response | null = {
          url: input,
          status: r.status,
          headers: resHs,
          body: text,
        }
        if (options.responseSanitizer !== null) {
          res = options.responseSanitizer(res)
          if (!res) {
            return
          }
        }

        const reqStr = JSON.stringify({
          headers: req.headers,
          body: req.body,
        })
        const resStr = JSON.stringify({
          headers: res.headers,
          body: res.body,
        })

        app.send(
          Messages.Fetch(
            typeof init.method === 'string' ? init.method.toUpperCase() : 'GET',
            input,
            reqStr,
            resStr,
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

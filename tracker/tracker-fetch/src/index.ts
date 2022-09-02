import { App, Messages } from '@openreplay/tracker';

interface RequestData {
  body: BodyInit | null | undefined
  headers: Record<string, string>
}

interface ResponseData {
  body: string | Object | null
  headers: Record<string, string>
}

interface RequestResponseData {
  readonly status: number
  readonly method: string
  url: string
  request: RequestData
  response: ResponseData
}

type WindowFetch = typeof fetch

export interface Options {
  fetch: WindowFetch,
  sessionTokenHeader?: string
  failuresOnly: boolean
  overrideGlobal: boolean
  ignoreHeaders: Array<string> | boolean
  sanitiser?: (RequestResponseData) => RequestResponseData | null

  // Depricated
  requestSanitizer?: any
  responseSanitizer?: any
}

export default function(opts: Partial<Options> = {}): (app: App | null) => WindowFetch | null {
  if (typeof window === 'undefined') {
    // not in browser (SSR)
    return () => opts.fetch || null 
  } 

  const options: Options = Object.assign(
    {
      overrideGlobal: false,
      failuresOnly: false,
      ignoreHeaders: [ 'Cookie', 'Set-Cookie', 'Authorization' ],
      fetch: window.fetch.bind(window),
    },
    opts,
  );
  if (options.requestSanitizer && options.responseSanitizer) {
    console.warn("OpenReplay fetch plugin: `requestSanitizer` and `responseSanitizer` options are depricated. Please, use `sanitiser` instead (check out documentation at https://docs.openreplay.com/plugins/fetch).")
  }

  return (app: App | null) => {
    if (app === null) {
      return options.fetch
    }

    const ihOpt = options.ignoreHeaders
    const isHIgnoring = Array.isArray(ihOpt)
      ? name => ihOpt.includes(name)
      : () => ihOpt

    const fetch = async (input: RequestInfo, init: RequestInit = {}) => {
      if (typeof input !== 'string') {
        return options.fetch(input, init);
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
      const response = await options.fetch(input, init);
      const duration = performance.now() - startTime;
      if (options.failuresOnly && response.status < 400) {
        return response
      }
      (async () => {
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

          const req: RequestData = {
            headers: reqHs,
            body: init.body,
          }

          // Response forming
          const res: ResponseData = {
            headers: resHs,
            body: text,
          }

          const method = typeof init.method === 'string' 
            ? init.method.toUpperCase() 
            : 'GET'
          let reqResInfo: RequestResponseData | null = {
            url: input,
            method,
            status: r.status,
            request: req,
            response: res,
          }
          if (options.sanitiser) {
            try {
              reqResInfo.response.body = JSON.parse(text) as Object // Why the returning type is "any"?
            } catch {}
            reqResInfo = options.sanitiser(reqResInfo)
            if (!reqResInfo) {
              return
            }
          }

          const getStj = (r: RequestData | ResponseData): string => {
            if (r && typeof r.body !== 'string') {
              try {
                r.body = JSON.stringify(r.body)
              } catch {
                r.body = "<unable to stringify>"
                //app.log.warn("Openreplay fetch") // TODO: version check
              }
            }
            return JSON.stringify(r)
          }

          app.send(
            Messages.Fetch(
              method,
              String(reqResInfo.url),
              getStj(reqResInfo.request),
              getStj(reqResInfo.response),
              r.status,
              startTime + performance.timing.navigationStart,
              duration,
            ),
          ) 
        })
      })()
      return response;
    }

    if (options.overrideGlobal) {
      window.fetch = fetch
    }
    return fetch;
  };

}

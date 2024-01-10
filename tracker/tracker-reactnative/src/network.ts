import setProxy from './Network/index';

interface RequestData {
  body: string | null;
  headers: Record<string, string>;
}

interface ResponseData {
  body: any;
  headers: Record<string, string>;
}

export interface RequestResponseData {
  readonly status: number;
  readonly method: string;
  url: string;
  request: RequestData;
  response: ResponseData;
}

type Sanitizer = (data: RequestResponseData) => RequestResponseData;

export interface Options {
  ignoreHeaders: Array<string> | boolean;
  capturePayload: boolean;
  captureInIframes: boolean;
  sanitizer?: Sanitizer;
  tokenUrlMatcher?: (url: string) => boolean;
  mode: 'fetch' | 'xhr' | 'all';
}

export default function (
  context = global,
  sendMessage: (args: any[]) => void,
  isServiceUrl: (url: string) => boolean,
  opts: Partial<Options> = {}
) {
  const options: Options = Object.assign(
    {
      failuresOnly: false,
      ignoreHeaders: ['cookie', 'set-cookie', 'authorization'],
      capturePayload: false,
      captureInIframes: true,
      axiosInstances: undefined,
      useProxy: true,
      mode: 'fetch',
    },
    opts
  );

  function sanitize(reqResInfo: RequestResponseData) {
    if (!options.capturePayload) {
      // @ts-ignore
      delete reqResInfo.request.body;
      delete reqResInfo.response.body;
    }
    if (options.sanitizer) {
      const resBody = reqResInfo.response.body;
      if (typeof resBody === 'string') {
        // Parse response in order to have handy view in sanitization function
        try {
          reqResInfo.response.body = JSON.parse(resBody);
        } catch {}
      }
      return options.sanitizer(reqResInfo);
    }
    return reqResInfo;
  }

  return setProxy(
    context,
    options.ignoreHeaders,
    sanitize,
    sendMessage,
    (url) => isServiceUrl(url),
    options.tokenUrlMatcher,
    options.mode
  );
}

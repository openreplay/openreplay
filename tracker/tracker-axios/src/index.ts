import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import { App, Messages } from '@openreplay/tracker';
import { getExceptionMessage } from '@openreplay/tracker/lib/modules/exception.js';  // TODO: export from tracker root
import { buildFullPath } from './url.js';


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

export interface Options {
	sessionTokenHeader?: string;
  instance: AxiosInstance;
  failuresOnly: boolean;
  captureWhen: (AxiosRequestConfig) => boolean;
  ignoreHeaders: Array<string> | boolean;
  sanitiser?: (RequestResponseData) => RequestResponseData | null;
}

// TODO: test webpack 5 for axios imports

function isAxiosResponse(r: any): r is AxiosResponse {
  return typeof r === "object" &&
    typeof r.config === "object" &&
    typeof r.status === "number"
}

export default function(opts: Partial<Options> = {}) {
	const options: Options = Object.assign(
    {
    	instance: axios,
    	failuresOnly: false,
    	captureWhen: () => true,
    	ignoreHeaders: [ 'Cookie', 'Set-Cookie', 'Authorization' ],
      sanitiser: null,
    },
    opts,
  );
	return (app: App | null) => {
    if (app === null) {
      return;
    }

    const ihOpt = options.ignoreHeaders
    const isHIgnoring = Array.isArray(ihOpt)
      ? name => ihOpt.includes(name)
      : () => ihOpt

    const sendFetchMessage = async (res: AxiosResponse) => {
      // ?? TODO: why config is undeined sometimes?
      if (!isAxiosResponse(res)) { return }
    	// @ts-ignore
    	const startTime: number = res.config.__openreplayStartTs;
    	const duration = performance.now() - startTime;
    	if (typeof startTime !== 'number') {
    		return;
    	}

    	let reqBody: string = '';
    	if (typeof res.config.data === 'string') {
 			  reqBody = res.config.data;
    	} else {
    		try {
    			reqBody = JSON.stringify(res.config.data) || '';
    		} catch (e) {} // TODO: app debug
    	}
    	let resBody: string = '';
    	if (typeof res.data === 'string') {
 			  resBody = res.data;
    	} else {
    		try {
    			resBody = JSON.stringify(res.data) || '';
    		} catch (e) {}
    	}

      const reqHs: Record<string, string> = {}
      const resHs: Record<string, string> = {}
      // TODO: type safe axios headers
      if (ihOpt !== true) {
        function writeReqHeader([n, v]: [string, string]) {
          if (!isHIgnoring(n)) { reqHs[n] = v }
        }
        if (res.config.headers instanceof Headers) {
          res.config.headers.forEach((v, n) => writeReqHeader([n, v]))
        } else if (Array.isArray(res.config.headers)) {
          res.config.headers.forEach(writeReqHeader);
        } else if (typeof res.config.headers === 'object') {
          Object.entries(res.config.headers as Record<string, string>).forEach(writeReqHeader)
        }

        // TODO: type safe axios headers
        if (typeof res.headers === 'object') {
          Object.entries(res.headers as Record<string, string>).forEach(([n, v]) => { if (!isHIgnoring(n)) resHs[n] = v })
        }
      } 

      // TODO: split the code on functions & files
    	// Why can't axios propogate the final request URL somewhere?
    	const url = buildFullPath(res.config.baseURL, options.instance.getUri(res.config))
      const method = typeof res.config.method === 'string' ? res.config.method.toUpperCase() : 'GET'
      const status = res.status
      let reqResData: RequestResponseData | null = {
        status,
        method,
        url,
        request: {
          headers: reqHs,
          body: reqBody,
        },
        response: {
          headers: resHs,
          body: resBody,
        },
      }
      if (options.sanitiser) {
        try {
          reqResData.response.body = JSON.parse(resBody) as Object // Why the returning type is "any"?
        } catch {}
        reqResData = options.sanitiser(reqResData)
        if (!reqResData) {
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
          String(reqResData.url),
          getStj(reqResData.request),
          getStj(reqResData.response),
          status,
          startTime + performance.timing.navigationStart,
          duration,
        ),
      );
    }

    options.instance.interceptors.request.use(function (config) {
      if (typeof config !== "object") { return config } // ??

      if (options.sessionTokenHeader) {
        const sessionToken = app.getSessionToken();
        if (sessionToken) {
          if (config.headers === undefined) {
            config.headers = {};
          }
          if (config.headers instanceof Headers) {
            config.headers.append(options.sessionTokenHeader, sessionToken);
          } else if (Array.isArray(config.headers)) {
            config.headers.push([options.sessionTokenHeader, sessionToken]);
          } else if (typeof config.headers === 'object') {
            config.headers[options.sessionTokenHeader] = sessionToken;
          }
        }
      }

      if (options.captureWhen(config)) { // TODO: use runWhen as axios publish a version with it
      	// @ts-ignore
      	config.__openreplayStartTs = performance.now();
      }

	    return config;
	  }, function (error) {
	    if (error instanceof Error) {
	  		app.send(getExceptionMessage(error, []));
	  	}
	    return Promise.reject(error);
	  }, 
		  // { synchronous: true, /* runWhen: captureWhen // is not published in axios yet */ }
		);
	  	
    options.instance.interceptors.response.use(function (response) {
    	if (!options.failuresOnly) {
    		sendFetchMessage(response);
    	}
	    return response;
	  }, function (error) {
	  	if (axios.isAxiosError(error) && error.response) {
	  		sendFetchMessage(error.response)
	  	} else if (!axios.isCancel(error) && error instanceof Error) {
	  		app.send(getExceptionMessage(error, []));
	  	}

      // TODO: common case (selector option) for modified responses
      if (isAxiosResponse(error)) {
        sendFetchMessage(error)
      }

	    return Promise.reject(error);
	  });
  }
}

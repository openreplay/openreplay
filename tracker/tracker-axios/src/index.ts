import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import { App, Messages } from '@openreplay/tracker';
import { getExceptionMessage } from '@openreplay/tracker/lib/modules/exception.js';  // TODO: export from tracker root
import { buildFullPath } from './url.js';

export interface Options {
	sessionTokenHeader?: string;
  instance: AxiosInstance;
  failuresOnly: boolean;
  captureWhen: (AxiosRequestConfig) => boolean;
  ignoreHeaders: Array<string> | boolean;
}


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

    const sendFetchMessage = (res: AxiosResponse) => {
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
          Object.entries(res.headers as Record<string, string>).forEach(([v, n]) => { if (!isHIgnoring(n)) resHs[n] = v })
        }
      } 

    	// Why can't axios propogate the final request URL somewhere?
    	const fullURL = buildFullPath(res.config.baseURL, options.instance.getUri(res.config));

      app.send(
        Messages.Fetch(
          typeof res.config.method === 'string' ? res.config.method.toUpperCase() : 'GET',
          fullURL,
          JSON.stringify({ 
            headers: reqHs,
            body: reqBody,
          }),
          JSON.stringify({ 
            headers: resHs,
            body: resBody,
          }),
          res.status,
          startTime + performance.timing.navigationStart,
          duration,
        ),
      );
    }

    // TODO: why app.safe doesn't work here?
    options.instance.interceptors.request.use(function (config) {
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

      // TODO: common case (selector)
      if (isAxiosResponse(error)) {
        sendFetchMessage(error)
      }

	    return Promise.reject(error);
	  });
  }
}
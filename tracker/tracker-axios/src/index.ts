import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import { App, Messages } from '@openreplay/tracker';
import { getExceptionMessage } from '@openreplay/tracker/lib/modules/exception';  // TODO: export from tracker root
import { buildFullPath } from './url';

export interface Options {
	sessionTokenHeader?: string;
  instance: AxiosInstance;
  failuresOnly: boolean;
  captureWhen: (AxiosRequestConfig) => boolean;
  //ingoreHeaders: Array<string> | boolean;
}

export default function(opts: Partial<Options> = {}) {
	const options: Options = Object.assign(
    {
    	instance: axios,
    	failuresOnly: true,
    	captureWhen: () => true,
    	//ingoreHeaders: [ 'Cookie', 'Set-Cookie', 'Authorization' ],
    },
    opts,
  );
	return (app: App | null) => {
    if (app === null) {
      return;
    }

    const sendFetchMessage = (response: AxiosResponse) => {
    	// @ts-ignore
    	const startTime: number = response.config.__openreplayStartTs;
    	const duration = performance.now() - startTime;
    	if (typeof startTime !== 'number') {
    		return;
    	}

    	let requestData: string = '';
    	if (typeof response.config.data === 'string') {
 			  requestData = response.config.data;
    	} else {
    		try {
    			requestData = JSON.stringify(response.config.data) || '';
    		} catch (e) {}
    	}
    	let responseData: string = '';
    	if (typeof response.data === 'string') {
 			  responseData = response.data;
    	} else {
    		try {
    			responseData = JSON.stringify(response.data) || '';
    		} catch (e) {}
    	}

    	// Why can't axios propogate the final request URL somewhere?
    	const fullURL = buildFullPath(response.config.baseURL, options.instance.getUri(response.config));

      app.send(
        Messages.Fetch(
          typeof response.config.method === 'string' ? response.config.method.toUpperCase() : 'GET',
          fullURL,
          requestData,
          responseData,
          response.status,
          startTime + performance.timing.navigationStart,
          duration,
        ),
      );
    }


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
          } else {
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

	    return Promise.reject(error);
	  });
  }
}
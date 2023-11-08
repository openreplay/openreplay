## this plugin is deprecated, all network tracking apis are moved into the main tracker codebase
______

# OpenReplay Tracker Axios plugin

Tracker plugin to support tracking of the [Axios](https://axios-http.com/) requests.

## Installation

```bash
npm i @openreplay/tracker-axios
```

## Usage

Initialize the `@openreplay/tracker` package as usual and load the plugin into it.

```js
import Tracker from '@openreplay/tracker';
import trackerAxios from '@openreplay/tracker-axios';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});
tracker.start();

tracker.use(trackerAxios({ /* options here*/ }));
```
Options:

```ts
{
	instance: AxiosInstance;                       // default: axios
  failuresOnly: boolean;                         // default: false
  captureWhen: (AxiosRequestConfig) => boolean;  // default: () => true
  sessionTokenHeader: string;                    // default: undefined
  ignoreHeaders: Array<string> | boolean,        // default [ 'Cookie', 'Set-Cookie', 'Authorization' ]
  sanitiser: (RequestResponseData) => RequestResponseData | null, // default: undefined

}
```

By default plugin connects to the static `axios` instance, but you can specify one with the `instance` option.

Set `failuresOnly` option to `true` if you want to record only failed requests, when the axios' promise is rejected. You can also [regulate](https://github.com/axios/axios#request-config) axios failing behaviour with the `validateStatus` option.

`captureWhen` parameter allows you to set a filter on request should be captured. The function will be called with the axios config object and expected to return `true` or `false`.

In case you use [OpenReplay integrations (sentry, bugsnag or others)](https://docs.openreplay.com/integrations), you can use `sessionTokenHeader` option to specify the header name. This header will be appended automatically to the each axios request and will contain OpenReplay session identificator value.

You can define list of headers that you don't want to capture with the `ignoreHeaders` options. Set its value to `false` if you want to catch them all (`true` if opposite). By default plugin ignores the list of headers that might be sensetive such as `[ 'Cookie', 'Set-Cookie', 'Authorization' ]`.

Sanitise sensitive data from fetch request/response or ignore request comletely with `sanitiser`. You can redact fields on the request object by modifying then returning it from the function:

```typescript
interface RequestData {
  body: BodyInit | null | undefined; // whatewer you've put in the init.body in fetch(url, init)
  headers: Record<string, string>;
}

interface ResponseData {
  body: string | Object | null;  // Object if response is of JSON type
  headers: Record<string, string>;
}

interface RequestResponseData {
  readonly status: number;
  readonly method: string;
  url: string;
  request: RequestData;
  response: ResponseData;
}

sanitiser: (data: RequestResponseData) => { // sanitise the body or headers
  if (data.url === "/auth") {
    data.request.body = null
  }

  if (data.request.headers['x-auth-token']) { // can also use ignoreHeaders option instead
    data.request.headers['x-auth-token'] = 'SANITISED';
  }

  // Sanitise response
  if (data.status < 400 && data.response.body.token) {
    data.response.body.token = "<TOKEN>"  
  }

  return data
}

// OR

sanitiser: data => { // ignore requests that start with /secure
  if (data.url.startsWith("/secure")) {
    return null
  }
  return data
}

// OR

sanitiser: data => { // sanitise request url: replace all numbers
  data.url = data.url.replace(/\d/g, "*")
  return data
}
```

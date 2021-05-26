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

tracker.use(trackerAxios());
```
Options:

```ts
{
	instance: AxiosInstance;                       // default: axios
  failuresOnly: boolean;                         // default: true
  captureWhen: (AxiosRequestConfig) => boolean;  // default: () => true
  sessionTokenHeader: string;                    // default: undefined
}
```
By default plugin connects to the static `axios` instance, but you can specify one with the `instance` option.

Set `failuresOnly` option to `false` if you want to record every single request regardless of the status code. By default only failed requests are captured, when the axios' promise is rejected. You can also [regulate](https://github.com/axios/axios#request-config) this axios behaviour with the `validateStatus` option.

`captureWhen` parameter allows you to set a filter on what should be captured. The function will be called with the axios config object and expected to return `true` or `false`.

In case you use [OpenReplay integrations (sentry, bugsnag or others)](https://docs.openreplay.com/integrations), you can use `sessionTokenHeader` option to specify the header name. This header will be appended automatically to the each axios request and will contain OpenReplay session identificator value.

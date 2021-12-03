# OpenReplay Tracker Fetch plugin

Tracker plugin to support tracking of the `fetch` requests payload.
Additionally it populates the requests with `sessionToken` header for backend logging.

## Installation

```bash
npm i @openreplay/tracker-fetch
```

## Usage

Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
Then you can use the provided `fetch` method from the plugin instead of built-in.

```js
import Tracker from '@openreplay/tracker';
import trackerFetch from '@openreplay/tracker-fetch';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});
tracker.start();

export const fetch = tracker.use(trackerFetch({ /* options here*/ }));

fetch('https://my.api.io/resource').then(response => response.json()).then(body => console.log(body));
```

Options:
```ts
{
  failuresOnly: boolean,                      // default false
  sessionTokenHeader: string | undefined,     // default undefined
  ignoreHeaders: Array<string> | boolean,     // default [ 'Cookie', 'Set-Cookie', 'Authorization' ]
}

```

Set `failuresOnly` option to `true` if you want to record only requests with the status code >= 400.

In case you use [OpenReplay integrations (sentry, bugsnag or others)](https://docs.openreplay.com/integrations), you can use `sessionTokenHeader` option to specify the header name. This header will be appended automatically to the each fetch request and will contain OpenReplay session identificator value.

You can define list of headers that you don't want to capture with the `ignoreHeaders` options. Set its value to `false` if you want to catch them all (`true` if opposite). By default plugin ignores the list of headers that might be sensetive such as `[ 'Cookie', 'Set-Cookie', 'Authorization' ]`.


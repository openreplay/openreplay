# OpenReplay Tracker Fetch plugin

Tracker plugin to support tracking of the `fetch` requests payload.
Additionally it populates the requests with `sessionID` header for backend logging.

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

export const fetch = tracker.use(trackerFetch({
  sessionTokenHeader: 'X-Session-ID', // optional
  failuresOnly: true //optional
}));

fetch('https://my.api.io/resource').then(response => response.json()).then(body => console.log(body));
```
In case you use OpenReplay integrations (sentry, bugsnag or others), you can use `sessionTokenHeader` option to specify the header name. This header will be appended automatically to the each fetch request and will contain OpenReplay session identificator value.

Set `failuresOnly` option to `true` if you want to record only requests with the status code >= 400.
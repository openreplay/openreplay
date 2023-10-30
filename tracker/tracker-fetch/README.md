## this plugin is deprecated, all network tracking apis are moved into the main tracker codebase
______

# Fetch plugin for OpenReplay

This plugin allows you to capture `fetch` payloads and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.

## Installation

```bash
npm i @openreplay/tracker-fetch
```

## Usage

Use the provided `fetch` method from the plugin instead of the one built-in.

### If your website is a Single Page Application (SPA)

```js
import tracker from '@openreplay/tracker';
import trackerFetch from '@openreplay/tracker-fetch';

const tracker = new OpenReplay({
  projectKey: PROJECT_KEY
});
const fetch = tracker.use(trackerFetch(options)); // check list of available options below

tracker.start();

fetch('https://myapi.com/').then(response => console.log(response.json()));
```

### If your web app is Server-Side-Rendered (SSR)

Follow the below example if your app is SSR. Ensure `tracker.start()` is called once the app is started (in `useEffect` or `componentDidMount`).

```js
import OpenReplay from '@openreplay/tracker/cjs';
import trackerFetch from '@openreplay/tracker-fetch/cjs';

const tracker = new OpenReplay({
  projectKey: PROJECT_KEY
});
const fetch = tracker.use(trackerFetch(options)); // check list of available options below

//...
function MyApp() {
  useEffect(() => { // use componentDidMount in case of React Class Component
    tracker.start();

    fetch('https://myapi.com/').then(response => console.log(response.json()));
  }, [])
//...
}

```

## Options

```js
trackerFetch({
  overrideGlobal: boolean;
  failuresOnly: boolean;
  sessionTokenHeader: string;
  ignoreHeaders: Array<string> | boolean;
  sanitiser: (RequestResponseData) => RequestResponseData | null;
})
```

- `overrideGlobal`: Overrides the default `window.fetch`. Default: `false`.
- `failuresOnly`: Captures requests having 4xx-5xx HTTP status code. Default: `false`.
- `sessionTokenHeader`: In case you have enabled some of our backend [integrations](/integrations) (i.e. Sentry), you can use this option to specify the header name (i.e. 'X-OpenReplay-SessionToken'). This latter gets appended automatically to each fetch request to contain the OpenReplay sessionToken's value. Default: `undefined`.
- `ignoreHeaders`: Helps define a list of headers you don't wish to capture. Set its value to `false` to capture all of them (`true` if none). Default: `['Cookie', 'Set-Cookie', 'Authorization']` so sensitive headers won't be captured.
- `sanitiser`: Sanitise sensitive data from fetch request/response or ignore request comletely. You can redact fields on the request object by modifying then returning it from the function:

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

## Troubleshooting

Having trouble setting up this plugin? please connect to our [Discord](https://discord.openreplay.com) and get help from our community.
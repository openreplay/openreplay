# OpenReplay Tracker Axios plugin

Tracker plugin for WebRTC video support at your site.

## Installation

```bash
npm i @openreplay/tracker-assist
```

## Usage

Initialize the `@openreplay/tracker` package as usual and load the plugin into it.

```js
import Tracker from '@openreplay/tracker';
import trackerAssist from '@openreplay/tracker-assist';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});
tracker.start();

tracker.use(trackerAssist());
```

Options:

```ts
{
  confirmText: string,
  confirmStyle: Object,
}
```
Use `confirmText` option to specify a text in the call confirmation popup.
You can specify its styles as well with  `confirmStyle` style object.

```ts
{
  background: "#555"
  color: "orange"
}

```
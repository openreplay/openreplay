# OpenReplay Tracker profiler plugin

The profiler plugin allows you to measure function performance and
capture the arguments and result for each function call.

## Installation

```bash
npm i @openreplay/tracker-profiler
```

## Usage

Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
Then decorate any function inside your code with the generated function.

```js
import Tracker from '@openreplay/tracker';
import trackerProfiler from '@openreplay/tracker-profiler';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});
tracker.start();

export const profiler = tracker.plugin(trackerProfiler());

const fn = profiler('call_name')(() => {
  // ...
}, thisArg); // thisArg is optional
```

# OpenReplay Tracker MobX plugin
A MobX plugin for OpenReplay Tracker. This plugin allows you to see the MobX events during session replay.

## Installation
```bash
npm i @openreplay/tracker-mobx
```

## Usage
Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
Then put the generated middleware into your Redux chain.

```js
import Tracker from '@openreplay/tracker';
import trackerMobX from '@openreplay/tracker-mobx';
import { observe } from 'mobx';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

const mobxTrackerInstance = tracker.use(trackerMobX(options)); // look below for available options
observe(yourMobxStore, mobxTrackerInstance)
```

Options: 

```js
interface Options {
    predicate?: (ev: { type: string; name: string; object: any; debugObjectName: string }) => boolean;
    sanitize?: (ev: { state: any; type: string; property: string }) => { state: any; type: string; property: string };
    update?: boolean;
    add?: boolean;
    delete?: boolean;
}

trackerMobX({
  predicate: () => true,
  sanitize: (event) => event
})
```

Where `predicate` can be used to dynamically turn off capturing and `sanitize` can be used to modify the payload before sending it to backend.

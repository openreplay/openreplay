# OpenReplay Tracker Vuex plugin
A Vuex plugin for OpenReplay Tracker. This plugin allows you to see the application state during session replay.

## Installation
```bash
npm i @openreplay/tracker-vuex
```

## Usage
Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
Then put the generated plugin into your `plugins` field of your store.

```js
import Vuex from 'vuex'
import Tracker from '@openreplay/tracker';
import trackerVuex from '@openreplay/tracker-vuex';

const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

const store = new Vuex.Store({
  // ...
  plugins: [tracker.plugin(trackerVuex())],
});
```

You can customize the plugin behavior with options to sanitize your data. They are similar to the ones from the standard `createLogger` plugin.

```js
trackerVuex({
  filter (mutation, state) {
    // returns `true` if a mutation should be logged
    // `mutation` is a `{ type, payload }`
    return mutation.type !== "aBlacklistedMutation";
  },
  transformer (state) {
    // transform the state before logging it.
    // for example return only a specific sub-tree
    return state.subTree;
  },
  mutationTransformer (mutation) {
    // mutations are logged in the format of `{ type, payload }`
    // we can format it any way we want.
    return mutation.type;
  },
})
```

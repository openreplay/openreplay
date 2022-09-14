# OpenReplay Tracker Zustand plugin
A Zustand plugin for OpenReplay Tracker. This plugin allows you to see the application state during session replay.

## Installation
```bash
npm i @openreplay/tracker-zustand
```

## Usage
Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
Then put the generated plugin into your `plugins` field of your store.

```js
import create from "zustand";
import Tracker from '@openreplay/tracker';
import trackerZustand from '@openreplay/tracker-zustand';


const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

const zustandPlugin = tracker.use(trackerZustand())
// store name, optional
// randomly generated if undefined
const bearStoreLogger = zustandPlugin('bear_store')


const useBearStore = create(
  bearStoreLogger((set: any) => ({
    bears: 0,
    increasePopulation: () => set((state: any) => ({ bears: state.bears + 1 })),
    removeAllBears: () => set({ bears: 0 }),
  }))
)

```

You can customize the plugin behavior with options to sanitize your data. They are similar to the ones from the standard `createLogger` plugin.

```js
trackerZustand({
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

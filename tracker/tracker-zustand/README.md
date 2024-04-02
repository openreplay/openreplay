# OpenReplay Tracker Zustand plugin
A Zustand plugin for OpenReplay Tracker. This plugin allows you to see the application state during session replay.

## Installation
```bash
npm i @openreplay/tracker-zustand
```

## Usage
Initialize the `@openreplay/tracker` package as usual and load the plugin into it.
Then put the generated plugin into your `plugins` field of your store.

```ts
import create from "zustand";
import Tracker from '@openreplay/tracker';
import trackerZustand, { StateLogger } from '@openreplay/tracker-zustand';


const tracker = new Tracker({
  projectKey: YOUR_PROJECT_KEY,
});

// as per https://docs.pmnd.rs/zustand/guides/typescript#middleware-that-doesn't-change-the-store-type
// cast type to new one
// but this seems to not be required and everything is working as is
const zustandPlugin = tracker.use(trackerZustand()) as unknown as StateLogger


const useBearStore = create(
  zustandPlugin((set: any) => ({
    bears: 0,
    increasePopulation: () => set((state: any) => ({ bears: state.bears + 1 })),
    removeAllBears: () => set({ bears: 0 }),
  }),
    // store name is optional
    // and is randomly generated if undefined
  'bear_store'
  )
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

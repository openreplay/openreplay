import { pluginDoc } from '../../PluginDoc';

export default pluginDoc({
  title: 'Zustand',
  icon: 'integrations/zustand',
  docs: 'https://docs.openreplay.com/plugins/zustand',
  pkg: '@openreplay/tracker-zustand',
  blurb: (t) =>
    t('Zustand store changes, before and after, to read back inside a replay.'),
  hint: (t) =>
    t(
      'Initialize the @openreplay/tracker package as usual and load the plugin into it. Then put the generated plugin into your plugins field of your store.',
    ),
  usage: (projectKey) => `import create from "zustand";
import { tracker } from '@openreplay/tracker';
import trackerZustand, { StateLogger } from '@openreplay/tracker-zustand';

tracker.configure({
  projectKey: '${projectKey}',
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
`,
  usageCjs: (projectKey) => `import create from "zustand";
import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerZustand, { StateLogger } from '@openreplay/tracker-zustand/cjs';


tracker.configure({
  projectKey: '${projectKey}',
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
)`,
});

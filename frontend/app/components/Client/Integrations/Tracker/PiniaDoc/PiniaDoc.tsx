import { pluginDoc } from '../../PluginDoc';

export default pluginDoc({
  title: 'Pinia',
  icon: 'integrations/pinia',
  docs: 'https://docs.openreplay.com/plugins/pinia',
  pkg: '@openreplay/tracker-vuex',
  blurb: (t) =>
    t('Pinia store changes, store by store, to read back inside a replay.'),
  hint: (t) =>
    t(
      'Initialize the @openreplay/tracker package as usual and load the plugin into it. Then put the generated plugin into your plugins field of your store.',
    ),
  usage: (projectKey) => `import Vuex from 'vuex'
import { tracker } from '@openreplay/tracker';
import trackerVuex from '@openreplay/tracker-vuex';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
tracker.start()
//...
const examplePiniaStore = useExamplePiniaStore()
// check list of available options below
const vuexPlugin = tracker.use(trackerVuex(<options>))
// add a name to your store, optional
//(will be randomly generated otherwise)
const piniaStorePlugin = vuexPlugin('STORE NAME')

// start tracking state updates
piniaStorePlugin(examplePiniaStore)
// now you can use examplePiniaStore as
// usual pinia store
// (destructure values or return it as a whole etc)
`,
  usageCjs: (projectKey) => `import Vuex from 'vuex'
import OpenReplay from '@openreplay/tracker/cjs';
import trackerVuex from '@openreplay/tracker-vuex/cjs';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
//...

// start tracker when the app is mounted
tracker.start()

//...
const examplePiniaStore = useExamplePiniaStore()
// check list of available options below
const vuexPlugin = tracker.use(trackerVuex(<options>))
// add a name to your store, optional
// (will be randomly generated otherwise)
const piniaStorePlugin = vuexPlugin('STORE NAME')

// start tracking state updates
piniaStorePlugin(examplePiniaStore)
// now you can use examplePiniaStore as
// usual pinia store
// (destructure values or return it as a whole etc)
`,
  cjsLanguage: 'js',
});

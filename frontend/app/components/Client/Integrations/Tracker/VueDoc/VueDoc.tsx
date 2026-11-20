import { pluginDoc } from '../../PluginDoc';

export default pluginDoc({
  title: 'VueX',
  icon: 'integrations/vuejs',
  docs: 'https://docs.openreplay.com/plugins/vuex',
  pkg: '@openreplay/tracker-vuex',
  blurb: (t) =>
    t(
      'VueX mutations and the state after each one, to read back inside a replay.',
    ),
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
const store = new Vuex.Store({
  //...
  plugins: [tracker.use(trackerVuex(<options>))] // check list of available options below
});`,
  usageCjs: (projectKey) => `import Vuex from 'vuex'
import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerVuex from '@openreplay/tracker-vuex/cjs';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
//...
function SomeFunctionalComponent() {
  useEffect(() => { // or componentDidMount in case of Class approach
    tracker.start()
  }, [])
//...
const store = new Vuex.Store({
    //...
    plugins: [tracker.use(trackerVuex(<options>))] // check list of available options below
  });
}`,
});

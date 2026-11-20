import { pluginDoc } from '../../PluginDoc';

export default pluginDoc({
  title: 'MobX',
  icon: 'integrations/mobx',
  docs: 'https://docs.openreplay.com/plugins/mobx',
  pkg: '@openreplay/tracker-mobx',
  blurb: (t) =>
    t('MobX observable changes as they happen, to read back inside a replay.'),
  hint: (t) =>
    t(
      'Initialize the @openreplay/tracker package as usual and load the plugin into it.',
    ),
  usage: (projectKey) => `import { tracker } from '@openreplay/tracker';
import trackerMobX from '@openreplay/tracker-mobx';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
tracker.use(trackerMobX(<options>)); // check list of available options below
tracker.start();
`,
  usageCjs: (projectKey) => `import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerMobX from '@openreplay/tracker-mobx/cjs';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
tracker.use(trackerMobX(<options>)); // check list of available options below
//...
function SomeFunctionalComponent() {
  useEffect(() => { // or componentDidMount in case of Class approach
    tracker.start()
  }, [])
}`,
});

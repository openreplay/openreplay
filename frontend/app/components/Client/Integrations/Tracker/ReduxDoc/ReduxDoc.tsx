import { pluginDoc } from '../../PluginDoc';

export default pluginDoc({
  title: 'Redux',
  icon: 'integrations/redux',
  docs: 'https://docs.openreplay.com/plugins/redux',
  pkg: '@openreplay/tracker-redux',
  blurb: (t) =>
    t(
      'Every dispatched action and the state after it, to read back inside a replay.',
    ),
  hint: (t) =>
    t(
      'Initialize the tracker then put the generated middleware into your Redux chain.',
    ),
  usage: (projectKey) => `import { applyMiddleware, createStore } from 'redux';
import { tracker } from '@openreplay/tracker';
import trackerRedux from '@openreplay/tracker-redux';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
tracker.start()
//...
const store = createStore(
  reducer,
  applyMiddleware(tracker.use(trackerRedux(<options>))) // check list of available options below
);`,
  usageCjs: (
    projectKey,
  ) => `import { applyMiddleware, createStore } from 'redux';
import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerRedux from '@openreplay/tracker-redux/cjs';
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
const store = createStore(
    reducer,
    applyMiddleware(tracker.use(trackerRedux(<options>))) // check list of available options below
  );
}`,
});

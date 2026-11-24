import { pluginDoc } from '../../PluginDoc';

export default pluginDoc({
  title: 'GraphQL',
  icon: 'integrations/graphql',
  docs: 'https://docs.openreplay.com/plugins/graphql',
  pkg: '@openreplay/tracker-graphql',
  blurb: (t) =>
    t(
      'Each operation with its variables and result. Works with Apollo and Relay.',
    ),
  hint: (t) =>
    t(
      'The plugin call will return the function, which receives four variables operationKind, operationName, variables and result. It returns result without changes.',
    ),
  usage: (projectKey) => `import { tracker } from '@openreplay/tracker';
import trackerGraphQL from '@openreplay/tracker-graphql';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
tracker.start()
//...
export const recordGraphQL = tracker.use(trackerGraphQL());`,
  usageCjs: (projectKey) => `import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerGraphQL from '@openreplay/tracker-graphql/cjs';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
//...
function SomeFunctionalComponent() {
  useEffect(() => { // or componentDidMount in case of Class approach
       tracker.start()
  }, [])
}
//...
export const recordGraphQL = tracker.use(trackerGraphQL());`,
});

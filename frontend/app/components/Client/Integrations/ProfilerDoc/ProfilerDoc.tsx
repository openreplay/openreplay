import { pluginDoc } from '../PluginDoc';

export default pluginDoc({
  title: 'Profiler',
  icon: 'integrations/openreplay',
  docs: 'https://docs.openreplay.com/plugins/profiler',
  pkg: '@openreplay/tracker-profiler',
  blurb: (t) =>
    t(
      'How long the functions you wrap take, with their arguments and results, on the session timeline.',
    ),
  hint: (t) =>
    t(
      'Initialize the tracker and load the plugin into it. Then decorate any function inside your code with the generated function.',
    ),
  usage: (projectKey) => `import { tracker } from '@openreplay/tracker';
import trackerProfiler from '@openreplay/tracker-profiler';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
tracker.start()
//...
export const profiler = tracker.use(trackerProfiler());
//...
const fn = profiler('call_name')(() => {
//...
}, thisArg); // thisArg is optional`,
  usageCjs: (projectKey) => `import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope

import trackerProfiler from '@openreplay/tracker-profiler/cjs';
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
export const profiler = tracker.use(trackerProfiler());
//...
const fn = profiler('call_name')(() => {
  //...
  }, thisArg); // thisArg is optional
}`,
});

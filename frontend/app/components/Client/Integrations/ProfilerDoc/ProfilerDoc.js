import { useStore } from "App/mstore";
import React from 'react';
import { observer } from 'mobx-react-lite';
import { CodeBlock } from 'UI';

import DocLink from 'Shared/DocLink/DocLink';
import ToggleContent from 'Shared/ToggleContent';

const ProfilerDoc = () => {
  const { integrationsStore, projectsStore } = useStore();
  const sites = projectsStore.list;
  const siteId = integrationsStore.integrations.siteId
  const projectKey = siteId ? sites.find((site) => site.id === siteId)?.projectKey : sites[0]?.projectKey

  const usage = `import OpenReplay from '@openreplay/tracker';
import trackerProfiler from '@openreplay/tracker-profiler';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
tracker.start()
//...
export const profiler = tracker.use(trackerProfiler());
//...
const fn = profiler('call_name')(() => {
//...
}, thisArg); // thisArg is optional`;
  const usageCjs = `import OpenReplay from '@openreplay/tracker/cjs';
import trackerProfiler from '@openreplay/tracker-profiler/cjs';
//...
const tracker = new OpenReplay({
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
}`;
  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '500px' }}
    >
      <h3 className="p-5 text-2xl">Profiler</h3>
      <div className="p-5">
        <div>
          The profiler plugin allows you to measure your JS functions'
          performance and capture both arguments and result for each function
          call.
        </div>

        <div className="font-bold my-2">Installation</div>
        <CodeBlock
          code={`npm i @openreplay/tracker-profiler --save`}
          language={'bash'}
        />

        <div className="font-bold my-2">Usage</div>
        <p>
          Initialize the tracker and load the plugin into it. Then decorate any
          function inside your code with the generated function.
        </p>
        <div className="py-3" />

        <div className="font-bold my-2">Usage</div>
        <ToggleContent
          label="Server-Side-Rendered (SSR)?"
          first={<CodeBlock language={'js'} code={usage} />}
          second={<CodeBlock language={'jsx'} code={usageCjs} />}
        />

        <DocLink
          className="mt-4"
          label="Integrate Profiler"
          url="https://docs.openreplay.com/plugins/profiler"
        />
      </div>
    </div>
  );
};

ProfilerDoc.displayName = 'ProfilerDoc';

export default observer(ProfilerDoc);

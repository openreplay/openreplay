import { CodeBlock } from '@/ui/data/CodeBlock';
import { Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ToggleContent from 'Shared/ToggleContent';

import { PluginPane, usePluginProject } from '../PluginPane';

function ProfilerDoc({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const scope = usePluginProject();
  const { projectKey } = scope;

  const usage = `import { tracker } from '@openreplay/tracker';
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
}, thisArg); // thisArg is optional`;
  const usageCjs = `import { tracker } from '@openreplay/tracker/cjs';
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
}`;
  return (
    <PluginPane
      title="Profiler"
      icon="integrations/openreplay"
      blurb={t(
        'How long the functions you wrap take, with their arguments and results, on the session timeline.',
      )}
      docs="https://docs.openreplay.com/plugins/profiler"
      scope={scope}
      onClose={onClose}
    >
      <Section title={t('Install')}>
        <CodeBlock
          code="npm i @openreplay/tracker-profiler --save"
          language="bash"
        />
      </Section>
      <Section
        title={t('Use')}
        hint={t(
          'Initialize the tracker and load the plugin into it. Then decorate any function inside your code with the generated function.',
        )}
      >
        <ToggleContent
          label={t('Server-Side-Rendered (SSR)?')}
          first={<CodeBlock language="js" code={usage} />}
          second={<CodeBlock language="jsx" code={usageCjs} />}
        />
      </Section>
    </PluginPane>
  );
}

ProfilerDoc.displayName = 'ProfilerDoc';

export default observer(ProfilerDoc);

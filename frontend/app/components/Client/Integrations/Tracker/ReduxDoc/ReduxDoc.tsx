import { CodeBlock } from '@/ui/data/CodeBlock';
import { Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ToggleContent from 'Components/shared/ToggleContent';

import { PluginPane, usePluginProject } from '../../PluginPane';

function ReduxDoc({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const scope = usePluginProject();
  const { projectKey } = scope;

  const usage = `import { applyMiddleware, createStore } from 'redux';
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
);`;
  const usageCjs = `import { applyMiddleware, createStore } from 'redux';
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
}`;
  return (
    <PluginPane
      title="Redux"
      icon="integrations/redux"
      blurb={t(
        'Every dispatched action and the state after it, to read back inside a replay.',
      )}
      docs="https://docs.openreplay.com/plugins/redux"
      scope={scope}
      onClose={onClose}
    >
      <Section title={t('Install')}>
        <CodeBlock
          code="npm i @openreplay/tracker-redux --save"
          language="bash"
        />
      </Section>
      <Section
        title={t('Use')}
        hint={t(
          'Initialize the tracker then put the generated middleware into your Redux chain.',
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

ReduxDoc.displayName = 'ReduxDoc';

export default observer(ReduxDoc);

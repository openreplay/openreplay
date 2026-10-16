import { CodeBlock } from '@/ui/data/CodeBlock';
import { Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ToggleContent from 'Shared/ToggleContent';

import { PluginPane, usePluginProject } from '../../PluginPane';

function MobxDoc({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const scope = usePluginProject();
  const { projectKey } = scope;

  const mobxUsage = `import { tracker } from '@openreplay/tracker';
import trackerMobX from '@openreplay/tracker-mobx';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
tracker.use(trackerMobX(<options>)); // check list of available options below
tracker.start();
`;

  const mobxUsageCjs = `import { tracker } from '@openreplay/tracker/cjs';
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
}`;

  return (
    <PluginPane
      title="MobX"
      icon="integrations/mobx"
      blurb={t(
        'MobX observable changes as they happen, to read back inside a replay.',
      )}
      docs="https://docs.openreplay.com/plugins/mobx"
      scope={scope}
      onClose={onClose}
    >
      <Section title={t('Install')}>
        <CodeBlock
          inline
          code="npm i @openreplay/tracker-mobx --save"
          copyLabel={t('Copy command')}
        />
      </Section>
      <Section
        title={t('Use')}
        hint={t(
          'Initialize the @openreplay/tracker package as usual and load the plugin into it.',
        )}
      >
        <ToggleContent
          label={t('Server-Side-Rendered (SSR)?')}
          first={<CodeBlock language="js" code={mobxUsage} />}
          second={<CodeBlock language="jsx" code={mobxUsageCjs} />}
        />
      </Section>
    </PluginPane>
  );
}

MobxDoc.displayName = 'MobxDoc';

export default observer(MobxDoc);

import { CodeBlock } from '@/ui/data/CodeBlock';
import { Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ToggleContent from 'Components/shared/ToggleContent';

import { PluginPane, usePluginProject } from '../../PluginPane';

function VueDoc({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const scope = usePluginProject();
  const { projectKey } = scope;

  const usage = `import Vuex from 'vuex'
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
});`;
  const usageCjs = `import Vuex from 'vuex'
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
}`;
  return (
    <PluginPane
      title="VueX"
      icon="integrations/vuejs"
      blurb={t(
        'VueX mutations and the state after each one, to read back inside a replay.',
      )}
      docs="https://docs.openreplay.com/plugins/vuex"
      scope={scope}
      onClose={onClose}
    >
      <Section title={t('Install')}>
        <CodeBlock
          inline
          code="npm i @openreplay/tracker-vuex --save"
          copyLabel={t('Copy command')}
        />
      </Section>
      <Section
        title={t('Use')}
        hint={t(
          'Initialize the @openreplay/tracker package as usual and load the plugin into it. Then put the generated plugin into your plugins field of your store.',
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

VueDoc.displayName = 'VueDoc';

export default observer(VueDoc);

import { CodeBlock } from '@/ui/data/CodeBlock';
import { Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ToggleContent from 'Components/shared/ToggleContent';

import { PluginPane, usePluginProject } from '../../PluginPane';

function PiniaDoc({ onClose }: { onClose?: () => void }) {
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
const examplePiniaStore = useExamplePiniaStore()
// check list of available options below
const vuexPlugin = tracker.use(trackerVuex(<options>))
// add a name to your store, optional
//(will be randomly generated otherwise)
const piniaStorePlugin = vuexPlugin('STORE NAME')

// start tracking state updates
piniaStorePlugin(examplePiniaStore)
// now you can use examplePiniaStore as
// usual pinia store
// (destructure values or return it as a whole etc)
`;
  const usageCjs = `import Vuex from 'vuex'
import OpenReplay from '@openreplay/tracker/cjs';
import trackerVuex from '@openreplay/tracker-vuex/cjs';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
//...

// start tracker when the app is mounted
tracker.start()

//...
const examplePiniaStore = useExamplePiniaStore()
// check list of available options below
const vuexPlugin = tracker.use(trackerVuex(<options>))
// add a name to your store, optional
// (will be randomly generated otherwise)
const piniaStorePlugin = vuexPlugin('STORE NAME')

// start tracking state updates
piniaStorePlugin(examplePiniaStore)
// now you can use examplePiniaStore as
// usual pinia store
// (destructure values or return it as a whole etc)
}`;
  return (
    <PluginPane
      title="Pinia"
      icon="integrations/pinia"
      blurb={t(
        'Pinia store changes, store by store, to read back inside a replay.',
      )}
      docs="https://docs.openreplay.com/plugins/pinia"
      scope={scope}
      onClose={onClose}
    >
      <Section title={t('Install')}>
        <CodeBlock
          code="npm i @openreplay/tracker-vuex --save"
          language="bash"
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
          first={<CodeBlock code={usage} language="js" />}
          second={<CodeBlock code={usageCjs} language="js" />}
        />
      </Section>
    </PluginPane>
  );
}

PiniaDoc.displayName = 'PiniaDoc';

export default observer(PiniaDoc);

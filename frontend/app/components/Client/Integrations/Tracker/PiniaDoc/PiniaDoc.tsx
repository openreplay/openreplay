import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from 'App/mstore';
import ToggleContent from 'Components/shared/ToggleContent';
import { CodeBlock } from 'UI';

import DocLink from 'Shared/DocLink/DocLink';
import { useTranslation } from 'react-i18next';

function PiniaDoc() {
  const { t } = useTranslation();
  const { integrationsStore, projectsStore } = useStore();
  const sites = projectsStore.list;
  const { siteId } = integrationsStore.integrations;
  const projectKey = siteId
    ? sites.find((site) => site.id === siteId)?.projectKey
    : sites[0]?.projectKey;
  const usage = `import Vuex from 'vuex'
import OpenReplay from '@openreplay/tracker';
import trackerVuex from '@openreplay/tracker-vuex';
//...
const tracker = new OpenReplay({
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
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '500px' }}
    >
      <h3 className="p-5 text-2xl">{t('Pinia')}</h3>
      <div className="p-5">
        <div>
          {t(
            'This plugin allows you to capture Pinia mutations + state and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.',
          )}
        </div>

        <div className="font-bold my-2 text-lg">{t('Installation')}</div>
        <CodeBlock
          code="npm i @openreplay/tracker-vuex --save"
          language="bash"
        />

        <div className="font-bold my-2 text-lg">{t('Usage')}</div>
        <p>
          {t(
            'Initialize the @openreplay/tracker package as usual and load the plugin into it. Then put the generated plugin into your plugins field of your store.',
          )}
        </p>
        <div className="py-3" />

        <ToggleContent
          label={t('Server-Side-Rendered (SSR)?')}
          first={<CodeBlock code={usage} language="js" />}
          second={<CodeBlock code={usageCjs} language="js" />}
        />

        <DocLink
          className="mt-4"
          label={t('Integrate Pinia')}
          url="https://docs.openreplay.com/plugins/pinia"
        />
      </div>
    </div>
  );
}

PiniaDoc.displayName = 'PiniaDoc';

export default observer(PiniaDoc);

import { useStore } from 'App/mstore';
import React from 'react';
import { CodeBlock } from 'UI';
import ToggleContent from 'Components/shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

function VueDoc() {
  const { t } = useTranslation();
  const { integrationsStore, projectsStore } = useStore();
  const sites = projectsStore.list;
  const { siteId } = integrationsStore.integrations;
  const projectKey = siteId
    ? sites.find((site) => site.id === siteId)?.projectKey
    : sites[0]?.projectKey;

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
    <div className="bg-white h-screen overflow-y-auto w-full">
      <h3 className="p-5 text-2xl">{t('VueX')}</h3>
      <div className="p-5">
        <div>
          {t(
            'This plugin allows you to capture VueX mutations/state and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.',
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
          first={<CodeBlock language="js" code={usage} />}
          second={<CodeBlock language="jsx" code={usageCjs} />}
        />

        <DocLink
          className="mt-4"
          label={t('Integrate Vuex')}
          url="https://docs.openreplay.com/plugins/vuex"
        />
      </div>
    </div>
  );
}

VueDoc.displayName = 'VueDoc';

export default observer(VueDoc);

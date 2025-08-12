import React from 'react';
import ToggleContent from 'Shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { CodeBlock } from 'UI';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

function MobxDoc() {
  const { t } = useTranslation();
  const { integrationsStore, projectsStore } = useStore();
  const sites = projectsStore.list;
  const { siteId } = integrationsStore.integrations;
  const projectKey = siteId
    ? sites.find((site) => site.id === siteId)?.projectKey
    : sites[0]?.projectKey;

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
    <div className="bg-white h-screen overflow-y-auto w-full">
      <h3 className="p-5 text-2xl">{t('MobX')}</h3>
      <div className="p-5">
        <div>
          {t(
            'This plugin allows you to capture MobX events and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.',
          )}
        </div>

        <div className="font-bold my-2">{t('Installation')}</div>
        <CodeBlock
          language="bash"
          code="npm i @openreplay/tracker-mobx --save"
        />

        <div className="font-bold my-2">{t('Usage')}</div>
        <p>
          {t(
            'Initialize the @openreplay/tracker package as usual and load the plugin into it. Then put the generated middleware into your Redux chain.',
          )}
        </p>
        <div className="py-3" />

        <div className="font-bold my-2">{t('Usage')}</div>
        <ToggleContent
          label={t('Server-Side-Rendered (SSR)?')}
          first={<CodeBlock language="js" code={mobxUsage} />}
          second={<CodeBlock language="jsx" code={mobxUsageCjs} />}
        />

        <DocLink
          className="mt-4"
          label={t('Integrate MobX')}
          url="https://docs.openreplay.com/plugins/mobx"
        />
      </div>
    </div>
  );
}

MobxDoc.displayName = 'MobxDoc';

export default observer(MobxDoc);

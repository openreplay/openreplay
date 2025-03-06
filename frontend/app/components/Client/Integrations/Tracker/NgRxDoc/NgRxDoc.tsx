import { useStore } from 'App/mstore';
import React from 'react';
import { CodeBlock } from 'UI';
import ToggleContent from 'Shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

function NgRxDoc() {
  const { t } = useTranslation();
  const { integrationsStore, projectsStore } = useStore();
  const sites = projectsStore.list;
  const { siteId } = integrationsStore.integrations;
  const projectKey = siteId
    ? sites.find((site) => site.id === siteId)?.projectKey
    : sites[0]?.projectKey;
  const usage = `import { StoreModule } from '@ngrx/store';
import { reducers } from './reducers';
import OpenReplay from '@openreplay/tracker';
import trackerNgRx from '@openreplay/tracker-ngrx';
//...
const tracker = new OpenReplay({
  projectKey: '${projectKey}'
});
tracker.start()
//...
const metaReducers = [tracker.use(trackerNgRx(<options>))]; // check list of available options below
//...
@NgModule({
  imports: [StoreModule.forRoot(reducers, { metaReducers })]
})
export class AppModule {}`;
  const usageCjs = `import { StoreModule } from '@ngrx/store';
import { reducers } from './reducers';
import OpenReplay from '@openreplay/tracker/cjs';
import trackerNgRx from '@openreplay/tracker-ngrx/cjs';
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
const metaReducers = [tracker.use(trackerNgRx(<options>))]; // check list of available options below
//...
  @NgModule({
    imports: [StoreModule.forRoot(reducers, { metaReducers })]
  })
  export class AppModule {}
}`;
  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '500px' }}
    >
      <h3 className="p-5 text-2xl">{t('NgRx')}</h3>
      <div className="p-5">
        <div>
          {t(
            'This plugin allows you to capture NgRx actions/state and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.',
          )}
        </div>

        <div className="font-bold my-2">{t('Installation')}</div>
        <CodeBlock
          code="npm i @openreplay/tracker-ngrx --save"
          language="bash"
        />

        <div className="font-bold my-2">{t('Usage')}</div>
        <p>
          {t(
            'Add the generated meta-reducer into your imports. See NgRx documentation for more details.',
          )}
        </p>
        <div className="py-3" />

        <div className="font-bold my-2">{t('Usage')}</div>
        <ToggleContent
          label={t('Server-Side-Rendered (SSR)?')}
          first={<CodeBlock language="js" code={usage} />}
          second={<CodeBlock language="jsx" code={usageCjs} />}
        />

        <DocLink
          className="mt-4"
          label={t('Integrate NgRx')}
          url="https://docs.openreplay.com/plugins/ngrx"
        />
      </div>
    </div>
  );
}

NgRxDoc.displayName = 'NgRxDoc';

export default observer(NgRxDoc);

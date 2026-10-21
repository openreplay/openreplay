import { CodeBlock } from '@/ui/data/CodeBlock';
import { Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ToggleContent from 'Shared/ToggleContent';

import { PluginPane, usePluginProject } from '../../PluginPane';

function NgRxDoc({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const scope = usePluginProject();
  const { projectKey } = scope;
  const usage = `import { StoreModule } from '@ngrx/store';
import { reducers } from './reducers';
import { tracker } from '@openreplay/tracker';
import trackerNgRx from '@openreplay/tracker-ngrx';
//...
tracker.configure({
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
import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerNgRx from '@openreplay/tracker-ngrx/cjs';
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
const metaReducers = [tracker.use(trackerNgRx(<options>))]; // check list of available options below
//...
  @NgModule({
    imports: [StoreModule.forRoot(reducers, { metaReducers })]
  })
  export class AppModule {}
}`;
  return (
    <PluginPane
      title="NgRx"
      icon="integrations/ngrx"
      blurb={t(
        'NgRx actions and the state they produce, to read back inside a replay.',
      )}
      docs="https://docs.openreplay.com/plugins/ngrx"
      scope={scope}
      onClose={onClose}
    >
      <Section title={t('Install')}>
        <CodeBlock
          inline
          code="npm i @openreplay/tracker-ngrx --save"
          copyLabel={t('Copy command')}
        />
      </Section>
      <Section
        title={t('Use')}
        hint={t(
          'Add the generated meta-reducer into your imports. See NgRx documentation for more details.',
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

NgRxDoc.displayName = 'NgRxDoc';

export default observer(NgRxDoc);

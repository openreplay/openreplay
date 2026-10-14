import { CodeBlock } from '@/ui/data/CodeBlock';
import { Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ToggleContent from 'Shared/ToggleContent';

import { PluginPane, usePluginProject } from '../../PluginPane';

function GraphQLDoc({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const scope = usePluginProject();
  const { projectKey } = scope;
  const usage = `import { tracker } from '@openreplay/tracker';
import trackerGraphQL from '@openreplay/tracker-graphql';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
tracker.start()
//...
export const recordGraphQL = tracker.use(trackerGraphQL());`;
  const usageCjs = `import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerGraphQL from '@openreplay/tracker-graphql/cjs';
//...
tracker.configure({
  projectKey: '${projectKey}'
});
//...
function SomeFunctionalComponent() {
  useEffect(() => { // or componentDidMount in case of Class approach
       tracker.start()
  }, [])
}
//...
export const recordGraphQL = tracker.use(trackerGraphQL());`;
  return (
    <PluginPane
      title="GraphQL"
      icon="integrations/graphql"
      blurb={t(
        'Each operation with its variables and result. Works with Apollo and Relay.',
      )}
      docs="https://docs.openreplay.com/plugins/graphql"
      scope={scope}
      onClose={onClose}
    >
      <Section title={t('Install')}>
        <CodeBlock
          code="npm i @openreplay/tracker-graphql --save"
          language="bash"
        />
      </Section>
      <Section
        title={t('Use')}
        hint={t(
          'The plugin call will return the function, which receives four variables operationKind, operationName, variables and result. It returns result without changes.',
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

GraphQLDoc.displayName = 'GraphQLDoc';

export default observer(GraphQLDoc);

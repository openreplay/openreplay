import { useStore } from 'App/mstore';
import React from 'react';
import { CodeBlock } from 'UI';
import DocLink from 'Shared/DocLink/DocLink';
import ToggleContent from 'Shared/ToggleContent';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

function GraphQLDoc() {
  const { t } = useTranslation();
  const { integrationsStore, projectsStore } = useStore();
  const sites = projectsStore.list;
  const { siteId } = integrationsStore.integrations;
  const projectKey = siteId
    ? sites.find((site) => site.id === siteId)?.projectKey
    : sites[0]?.projectKey;
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
    <div
      className="bg-white h-screen overflow-y-auto w-full"
    >
      <h3 className="p-5 text-2xl">{t('GraphQL')}</h3>
      <div className="p-5">
        <p>
          {t(
            'This plugin allows you to capture GraphQL requests and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.',
          )}
        </p>
        <p>
          {t(
            'GraphQL plugin is compatible with Apollo and Relay implementations.',
          )}
        </p>

        <div className="font-bold my-2">{t('Installation')}</div>
        <CodeBlock
          code="npm i @openreplay/tracker-graphql --save"
          language="bash"
        />

        <div className="font-bold my-2">{t('Usage')}</div>
        <p>
          {t(
            'The plugin call will return the function, which receives four variables operationKind, operationName, variables and result. It returns result without changes.',
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
          label={t('Integrate GraphQL')}
          url="https://docs.openreplay.com/plugins/graphql"
        />
      </div>
    </div>
  );
}

GraphQLDoc.displayName = 'GraphQLDoc';

export default observer(GraphQLDoc);

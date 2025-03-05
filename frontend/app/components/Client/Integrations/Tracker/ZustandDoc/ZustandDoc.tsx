import { useStore } from 'App/mstore';
import React from 'react';
import { CodeBlock } from 'UI';
import ToggleContent from 'Components//shared/ToggleContent';
import DocLink from 'Shared/DocLink/DocLink';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

function ZustandDoc(props) {
  const { t } = useTranslation();
  const { integrationsStore, projectsStore } = useStore();
  const sites = projectsStore.list;
  const { siteId } = integrationsStore.integrations;
  const projectKey = siteId
    ? sites.find((site) => site.id === siteId)?.projectKey
    : sites[0]?.projectKey;

  const usage = `import create from "zustand";
import Tracker from '@openreplay/tracker';
import trackerZustand, { StateLogger } from '@openreplay/tracker-zustand';


const tracker = new Tracker({
  projectKey: ${projectKey},
});

// as per https://docs.pmnd.rs/zustand/guides/typescript#middleware-that-doesn't-change-the-store-type
// cast type to new one
// but this seems to not be required and everything is working as is
const zustandPlugin = tracker.use(trackerZustand()) as unknown as StateLogger


const useBearStore = create(
  zustandPlugin((set: any) => ({
    bears: 0,
    increasePopulation: () => set((state: any) => ({ bears: state.bears + 1 })),
    removeAllBears: () => set({ bears: 0 }),
  }),
    // store name is optional
    // and is randomly generated if undefined
  'bear_store'
  )
)
`;
  const usageCjs = `import create from "zustand";
import Tracker from '@openreplay/tracker/cjs';
import trackerZustand, { StateLogger } from '@openreplay/tracker-zustand/cjs';


const tracker = new Tracker({
  projectKey: ${projectKey},
});

// as per https://docs.pmnd.rs/zustand/guides/typescript#middleware-that-doesn't-change-the-store-type
// cast type to new one
// but this seems to not be required and everything is working as is
const zustandPlugin = tracker.use(trackerZustand()) as unknown as StateLogger


const useBearStore = create(
  zustandPlugin((set: any) => ({
    bears: 0,
    increasePopulation: () => set((state: any) => ({ bears: state.bears + 1 })),
    removeAllBears: () => set({ bears: 0 }),
  }),
    // store name is optional
    // and is randomly generated if undefined
  'bear_store'
  )
)`;
  return (
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '500px' }}
    >
      <h3 className="p-5 text-2xl">{t('Zustand')}</h3>
      <div className="p-5">
        <div>
          {t(
            'This plugin allows you to capture Zustand mutations/state and inspect them later on while replaying session recordings. This is very useful for understanding and fixing issues.',
          )}
        </div>

        <div className="font-bold my-2 text-lg">{t('Installation')}</div>
        <CodeBlock
          language="bash"
          code="npm i @openreplay/tracker-zustand --save"
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
          label={t('Integrate Zustand')}
          url="https://docs.openreplay.com/plugins/zustand"
        />
      </div>
    </div>
  );
}

ZustandDoc.displayName = 'ZustandDoc';

export default observer(ZustandDoc);

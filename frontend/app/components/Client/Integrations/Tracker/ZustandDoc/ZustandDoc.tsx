import { CodeBlock } from '@/ui/data/CodeBlock';
import { Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ToggleContent from 'Components//shared/ToggleContent';

import { PluginPane, usePluginProject } from '../../PluginPane';

function ZustandDoc({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const scope = usePluginProject();
  const { projectKey } = scope;

  const usage = `import create from "zustand";
import { tracker } from '@openreplay/tracker';
import trackerZustand, { StateLogger } from '@openreplay/tracker-zustand';

tracker.configure({
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
import { tracker } from '@openreplay/tracker/cjs';
// alternatively you can use dynamic import without /cjs suffix to prevent issues with window scope
import trackerZustand, { StateLogger } from '@openreplay/tracker-zustand/cjs';


tracker.configure({
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
    <PluginPane
      title="Zustand"
      icon="integrations/zustand"
      blurb={t(
        'Zustand store changes, before and after, to read back inside a replay.',
      )}
      docs="https://docs.openreplay.com/plugins/zustand"
      scope={scope}
      onClose={onClose}
    >
      <Section title={t('Install')}>
        <CodeBlock
          inline
          code="npm i @openreplay/tracker-zustand --save"
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

ZustandDoc.displayName = 'ZustandDoc';

export default observer(ZustandDoc);

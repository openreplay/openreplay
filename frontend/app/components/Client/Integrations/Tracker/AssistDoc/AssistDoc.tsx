import { CodeBlock } from '@/ui/data/CodeBlock';
import { Tabs, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { Section } from '@/ui/overlays/EntityDrawer';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PluginPane, usePluginProject } from '../../PluginPane';
import AssistNpm from './AssistNpm';
import AssistScript from './AssistScript';

const NPM = 'NPM';
const SCRIPT = 'SCRIPT';
const TABS = [
  { key: SCRIPT, text: SCRIPT },
  { key: NPM, text: NPM },
];

function AssistDoc({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const scope = usePluginProject();
  const { projectKey } = scope;
  const [activeTab, setActiveTab] = useState(SCRIPT);

  const renderActiveTab = () => {
    switch (activeTab) {
      case SCRIPT:
        return <AssistScript projectKey={projectKey} />;
      case NPM:
        return <AssistNpm projectKey={projectKey} />;
    }
    return null;
  };

  return (
    <PluginPane
      title="Assist"
      icon="integrations/openreplay"
      blurb={t(
        'Lets your team see a user’s live screen and call them over WebRTC, with no screen-sharing software.',
      )}
      docs="https://docs.openreplay.com/installation/assist"
      scope={scope}
      onClose={onClose}
    >
      <Section title={t('Install')}>
        <CodeBlock
          inline
          code="npm i @openreplay/tracker-assist"
          copyLabel={t('Copy command')}
        />
      </Section>
      <Section title={t('Use')}>
        <div className="m-int__stack">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key}>
                  {tab.text}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {renderActiveTab()}
        </div>
      </Section>
    </PluginPane>
  );
}

AssistDoc.displayName = 'AssistDoc';

export default observer(AssistDoc);

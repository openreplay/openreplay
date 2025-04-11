import { useStore } from 'App/mstore';
import React, { useState } from 'react';
import DocLink from 'Shared/DocLink/DocLink';
import { Tabs, CodeBlock } from 'UI';
import { observer } from 'mobx-react-lite';
import AssistScript from './AssistScript';
import AssistNpm from './AssistNpm';
import { useTranslation } from 'react-i18next';

const NPM = 'NPM';
const SCRIPT = 'SCRIPT';
const TABS = [
  { key: SCRIPT, text: SCRIPT },
  { key: NPM, text: NPM },
];

function AssistDoc() {
  const { t } = useTranslation();
  const { integrationsStore, projectsStore } = useStore();
  const sites = projectsStore.list;
  const { siteId } = integrationsStore.integrations;
  const projectKey = siteId
    ? sites.find((site) => site.id === siteId)?.projectKey
    : sites[0]?.projectKey;
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
    <div
      className="bg-white h-screen overflow-y-auto"
      style={{ width: '500px' }}
    >
      <h3 className="p-5 text-2xl">{t('Assist')}</h3>
      <div className="p-5">
        <div>
          {t(
            'OpenReplay Assist allows you to support your users by seeing their live screen and instantly hopping on call (WebRTC) with them without requiring any 3rd-party screen sharing software.',
          )}
        </div>

        <div className="font-bold my-2">{t('Installation')}</div>
        <CodeBlock language="bash" code="npm i @openreplay/tracker-assist" />
        <div className="mb-4" />

        <div className="font-bold my-2">{t('Usage')}</div>
        <Tabs
          tabs={TABS}
          active={activeTab}
          onClick={(tab) => setActiveTab(tab)}
        />

        <div className="py-5">{renderActiveTab()}</div>

        <DocLink
          className="mt-4"
          label={t('Install Assist')}
          url="https://docs.openreplay.com/installation/assist"
        />
      </div>
    </div>
  );
}

AssistDoc.displayName = 'AssistDoc';

export default observer(AssistDoc);

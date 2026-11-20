import { CodeBlock } from '@/ui/data/CodeBlock';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { trackerSnippet } from 'Components/Onboarding/install';

function AssistScript({
  projectKey,
  host,
}: {
  projectKey: string;
  host: string;
}) {
  const { t } = useTranslation();
  const scriptCode = trackerSnippet({
    projectKey,
    host,
    platform: 'web',
    method: 'script',
    ssr: false,
    assist: true,
  });
  return (
    <>
      <p className="m-int__blurb">
        {t(
          'If your OpenReplay tracker is set up using the JS snippet, then simply replace the .../openreplay.js occurrence with .../openreplay-assist.js. Below is an example of how the script should like after the change:',
        )}
      </p>
      <CodeBlock code={scriptCode} language="js" />
    </>
  );
}

export default AssistScript;

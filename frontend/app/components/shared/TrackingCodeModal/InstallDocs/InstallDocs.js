import React from 'react';
import cn from 'classnames';
import { CopyButton, CodeBlock } from 'UI';
import stl from './installDocs.module.css';
import { useTranslation } from 'react-i18next';

const installationCommand = 'npm i @openreplay/tracker';
const usageCode = `import Tracker from '@openreplay/tracker';

const tracker = new Tracker({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});

tracker.start()`;
const usageCodeSST = `import Tracker from '@openreplay/tracker/cjs';

const tracker = new Tracker({
  projectKey: "PROJECT_KEY",
  ingestPoint: "https://${window.location.hostname}/ingest",
});

function MyApp() {
  useEffect(() => { // use componentDidMount in case of React Class Component
    tracker.start()
  }, []);
  
  //...
}`;

function InstallDocs({ site }) {
  const { t } = useTranslation();
  const _usageCode = usageCode.replace('PROJECT_KEY', site.projectKey);
  return (
    <div>
      <div className="mb-3">
        <div className="font-semibold mb-2">{t('1. Installation')}</div>
        <div className="">
          {/* <CopyButton content={installationCommand} className={cn(stl.codeCopy, 'mt-2 mr-2')} /> */}
          <div className={cn(stl.snippetWrapper, '')}>
            <CopyButton
              content={installationCommand}
              className={cn(stl.codeCopy, 'mt-2 mr-2')}
            />
            <CodeBlock code={installationCommand} language="bash" />
          </div>
        </div>
      </div>
      <div>
        <div className="font-semibold mb-2">{t('2. Usage')}</div>
        <div className="">
          <div className={cn(stl.snippetWrapper, '')}>
            <CopyButton
              content={_usageCode}
              className={cn(stl.codeCopy, 'mt-2 mr-2')}
            />
            <CodeBlock code={_usageCode} language="js" />
          </div>
        </div>
      </div>
      <div className="mt-6">
        {t('See')}
        <a
          href="https://docs.openreplay.com/en/sdk/"
          className="color-teal underline"
          target="_blank"
          rel="noreferrer"
        >
          {t('Documentation')}
        </a>{' '}
        {t('for the list of available options.')}
      </div>
    </div>
  );
}

export default InstallDocs;

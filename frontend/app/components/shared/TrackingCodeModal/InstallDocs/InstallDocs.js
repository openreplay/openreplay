import React from 'react';
import cn from 'classnames';
import { CopyButton, CodeBlock } from 'UI';
import stl from './installDocs.module.css';
import { useTranslation } from 'react-i18next';
import { usageCode } from './code';

const lastMajor = window.env.TRACKER_MAJOR_VERSION
  ? window.env.TRACKER_MAJOR_VERSION
  : window.env.TRACKER_VERSION
    ? window.env.TRACKER_VERSION.split('.')[0]
    : null;
const installationCommand = `npm i @openreplay/tracker${lastMajor ? `@${lastMajor}` : ''}`;

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

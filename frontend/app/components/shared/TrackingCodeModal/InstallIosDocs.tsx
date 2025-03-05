import React from 'react';
import cn from 'classnames';
import { Segmented } from 'antd';
import { CopyButton, CodeBlock } from 'UI';
import stl from './InstallDocs/installDocs.module.css';
import {
  usageCode as iosUsageCode,
  installationCommand as iosInstallCommand,
} from '../../Onboarding/components/OnboardingTabs/InstallDocs/MobileInstallDocs';
import {
  usageCode as androidUsageCode,
  installationCommand as androidInstallCommand,
} from '../../Onboarding/components/OnboardingTabs/InstallDocs/AndroidInstallDocs';
import { useTranslation } from 'react-i18next';

function InstallMobileDocs({ site, ingestPoint }: any) {
  const { t } = useTranslation();
  const [isIos, setIsIos] = React.useState(true);

  const usageCode = isIos ? iosUsageCode : androidUsageCode;
  const installationCommand = isIos ? iosInstallCommand : androidInstallCommand;
  const _usageCode = usageCode
    .replace('PROJECT_KEY', site.projectKey)
    .replace('INGEST_POINT', ingestPoint);

  const docLink = `https://docs.openreplay.com/en/${isIos ? 'ios-' : 'android-'}sdk/`;
  return (
    <div>
      <div className="mb-3">
        <Segmented
          options={[
            { label: 'iOS', value: true },
            { label: 'Android', value: false },
          ]}
          value={isIos}
          onChange={setIsIos}
        />
      </div>
      <div className="mb-3">
        <div className="font-semibold mb-2">{t('1. Installation')}</div>
        <div className="">
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
            <CodeBlock code={_usageCode} language={isIos ? 'swift' : 'kt'} />
          </div>
        </div>
      </div>
      <div className="mt-6">
        {t('See')}
        <a
          href={docLink}
          className="color-teal underline"
          target="_blank"
          rel="noreferrer"
        >
          {t(' Documentation')}
        </a>{' '}
        {t('for the list of available options.')}
      </div>
    </div>
  );
}

export default InstallMobileDocs;

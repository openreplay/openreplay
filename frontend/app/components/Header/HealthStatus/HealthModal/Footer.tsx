import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import { useTranslation } from 'react-i18next';

function Footer({ isSetup }: { isSetup?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex w-full p-4 items-center justify-center',
        'bg-gray-lightest gap-8',
        !isSetup ? 'border-t border-figmaColors-divider' : '',
      )}
    >
      <a
        href="https://docs.openreplay.com/en/troubleshooting/"
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center gap-2 hover:underline"
      >
        <Icon name="tools" size={16} />
        {t('Troubleshooting guide')}
      </a>
      <a
        href="https://slack.openreplay.com/"
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center gap-2 hover:underline"
      >
        <Icon name="slack" size={16} />
        {t('Ask slack community')}
      </a>
      <a
        href="https://github.com/openreplay/openreplay/issues/new/choose"
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center gap-2 hover:underline"
      >
        <Icon name="github" size={16} />
        {t('Raise an issue')}
      </a>
    </div>
  );
}

export default Footer;

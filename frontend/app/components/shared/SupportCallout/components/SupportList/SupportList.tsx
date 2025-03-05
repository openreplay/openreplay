import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from 'UI';

function SupportList() {
  const { t } = useTranslation();
  return (
    <div className="rounded bg-white border shadow">
      <a href="https://docs.openreplay.com" target="_blank" rel="noreferrer">
        <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-active-blue">
          <Icon name="book" size={15} />
          <div className="ml-2">{t('Docs')}</div>
        </div>
      </a>
      <a
        href="https://github.com/openreplay/openreplay/issues/new/choose"
        target="_blank"
        rel="noreferrer"
      >
        <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-active-blue">
          <Icon name="github" size={15} />
          <div className="ml-2">{t('Report Issues')}</div>
        </div>
      </a>
      <a href="https://slack.openreplay.com" target="_blank" rel="noreferrer">
        <div className="flex items-center px-4 py-3 cursor-pointer hover:bg-active-blue">
          <Icon name="slack" size={15} />
          <div className="ml-2">{t('Community Support')}</div>
        </div>
      </a>
    </div>
  );
}

export default SupportList;

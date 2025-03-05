import React from 'react';
import { useTranslation } from 'react-i18next';

function Copyright() {
  const { t } = useTranslation();
  return (
    <div className="fixed bottom-0 m-auto text-center mb-6 color-gray-medium">
      {t('© 2024 OpenReplay. All rights reserved.')}{' '}
      <a
        className="underline"
        href="https://openreplay.com/privacy.html"
        target="_blank"
        rel="noreferrer"
      >
        {t('Privacy')}
      </a>{' '}
      {t('and')}{' '}
      <a
        className="underline"
        href="https://openreplay.com/terms.html"
        target="_blank"
        rel="noreferrer"
      >
        {t('Terms')}
      </a>
      .
    </div>
  );
}

export default Copyright;

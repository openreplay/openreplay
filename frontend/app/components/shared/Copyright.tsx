import React from 'react';
import { useTranslation } from 'react-i18next';

const Copyright = React.memo(() => {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();
  return (
    <footer className="fixed bottom-0 m-auto text-center mb-6 text-gray-500">
      {`© ${currentYear} ${t('OpenReplay. All rights reserved')}. `}
      <a
        className="link"
        href="https://openreplay.com/legal/privacy"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('Privacy')}
      </a>
      &nbsp;{t('and')}&nbsp;
      <a
        className="link"
        href="https://openreplay.com/legal/terms"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('Terms')}
      </a>
      .
    </footer>
  );
});

export default Copyright;

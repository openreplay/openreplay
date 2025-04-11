import React from 'react';
import { useTranslation } from 'react-i18next';

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div
      className="inset-0 flex items-center justify-center absolute"
      style={{
        height: 'calc(100vh - 50px)',
        // zIndex: '999',
      }}
    >
      <div className="flex flex-col items-center">
        <div className="text-2xl -mt-8">{t('Session not found.')}</div>
        <div className="text-sm">
          {t('Please check your data retention policy.')}
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;

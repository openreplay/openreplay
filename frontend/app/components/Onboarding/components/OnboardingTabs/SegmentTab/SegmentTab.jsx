import React from 'react';
import { useTranslation } from 'react-i18next';

export default function SegmentTab() {
  const { t } = useTranslation();
  return (
    <div>
      <p>
        <b>{t('Note:')}</b>{' '}
        {t('This integration is only available to OpenReplay Cloud customers.')}
      </p>
      <p>
        {t(
          'Segment allows you to collect your user data from every source into a single exportable API. You can then send that information to all your favorite tools instantly.',
        )}
      </p>
      <p>
        {t(
          'With this integration, you don’t have to add any code to your site. If you have a Segment account, all you need to do is to set your OpenReplay ProjectID then enable the integration as specified in the instructions below.',
        )}
      </p>
      <div className="mt-6">
        {t('See')}
        <a
          href="https://docs.openreplay.com/api"
          className="color-teal underline"
          target="_blank"
          rel="noreferrer"
        >
          {t('API')}
        </a>{' '}
        {t('for more options.')}
      </div>
    </div>
  );
}

import { Notice } from '@/ui/feedback/Notice';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { client } from 'App/routes';
import { useHistory } from 'App/routing';

function LangBanner({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <Notice
      kind="info"
      onDismiss={onClose}
      action={
        <button
          type="button"
          className="m-notice__link"
          onClick={() => history.push(client('account'))}
        >
          {t('Change language')}
        </button>
      }
    >
      {t('OpenReplay now speaks French, Russian, Chinese and Spanish.')}
    </Notice>
  );
}

export default LangBanner;

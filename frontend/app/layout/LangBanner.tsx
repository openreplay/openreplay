import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { Info, Languages, X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { client } from 'App/routes';
import { useHistory } from 'App/routing';

import './banners.css';

function LangBanner({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <div className="m-banner m-banner--warning" role="status">
      <Info size={15} aria-hidden="true" />
      <span className="m-banner__text">
        {t(
          'OpenReplay now supports French, Russian, Chinese, and Spanish. Update your language in settings.',
        )}
      </span>
      <span className="m-banner__actions">
        <Button onClick={() => history.push(client('account'))}>
          <Languages size={13} />
          {t('Change language')}
        </Button>
        <IconButton
          icon={<X size={14} />}
          label={t('Dismiss')}
          variant="ghost"
          onClick={onClose}
        />
      </span>
    </div>
  );
}

export default LangBanner;

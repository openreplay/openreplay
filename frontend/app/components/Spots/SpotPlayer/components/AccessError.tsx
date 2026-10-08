import { login } from '@/routes';
import { Button } from '@/ui/actions/button';
import { Icon } from '@/ui/icons/Icon';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Link } from 'App/routing';

import AnimatedSVG, { ICONS } from 'Shared/AnimatedSVG/AnimatedSVG';

function AccessError() {
  const { t } = useTranslation();
  return (
    <div className="w-full h-full block ">
      <div className="flex bg-white border-b text-center justify-center py-4">
        <a href="https://openreplay.com/spot" target="_blank" rel="noreferrer">
          <Button
            variant="subtle"
            className="orSpotBranding flex gap-1 items-center"
            size="md"
          >
            <Icon size={40} name="integrations/openreplay" />
            <div className="flex flex-row gap-2 items-center text-start">
              <div className="text-3xl font-semibold ">
                {t('OpenReplay Spot')}
              </div>
            </div>
          </Button>
        </a>
      </div>
      <div className="m-panel z-50 mx-auto flex min-h-60 w-1/2 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="text-lg font-medium text-content-primary">
          {t('The Spot link or your login session has expired.')}
        </div>
        <p className="text-sm text-content-muted">
          {t(
            'Try to log in again or contact the person who shared it to share it again.',
          )}
        </p>
        <Link to={login()} className="link text-center block mt-8 text-lg">
          <Button>{t('Back to Login')}</Button>
        </Link>
      </div>
      <div className="rotate-180 -z-10 w-fit mx-auto -mt-5 hover:mt-2 transition-all ease-in-out hover:rotate-0 hover:transition-all hover:ease-in-out duration-500 hover:duration-150">
        <AnimatedSVG name={ICONS.NO_RECORDINGS} size={60} />
      </div>
    </div>
  );
}

export default AccessError;

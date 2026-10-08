import { trackerInstance } from '@/init/openreplay';
import { Button } from '@/ui/actions/button';
import { Notice } from '@/ui/feedback/Notice';
import { SquareArrowOutUpRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { onboarding as onboardingRoute, withSiteId } from 'App/routes';
import { useNavigate } from 'App/routing';

function NoSessionsMessage() {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const navigate = useNavigate();
  const site = projectsStore.active;
  if (!site || site.recorded) return null;

  const troubleshoot = () => {
    trackerInstance.event('troubleshoot_clicked');
    window.open(
      'https://docs.openreplay.com/en/troubleshooting/session-recordings/',
      '_blank',
    );
  };

  return (
    <Notice kind="info">
      <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="min-w-0 flex-1">
          {t(
            'Your sessions will appear here soon. It may take a few minutes as sessions are optimized for efficient playback.',
          )}
        </span>
        <span className="flex items-center gap-2">
          <Button variant="subtle" onClick={troubleshoot}>
            {t('Troubleshoot')}
            <SquareArrowOutUpRight size={12} />
          </Button>
          <Button
            onClick={() =>
              navigate(
                withSiteId(onboardingRoute('installing'), projectsStore.siteId),
              )
            }
          >
            {t('Complete project setup')}
          </Button>
        </span>
      </span>
    </Notice>
  );
}

export default observer(NoSessionsMessage);

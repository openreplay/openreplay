import { trackerInstance } from '@/init/openreplay';
import { Button } from '@/ui/actions/button';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SquareArrowOutUpRight } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { onboarding as onboardingRoute, withSiteId } from 'App/routes';
import { useNavigate } from 'App/routing';

/** The list's own empty state while a project has recorded nothing yet. */
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
    <EmptyState
      art="listening"
      title={t('Your sessions will appear here soon')}
      hint={t(
        'It may take a few minutes as sessions are optimized for efficient playback.',
      )}
      action={
        <span className="flex flex-wrap items-center justify-center gap-2">
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
      }
    />
  );
}

export default observer(NoSessionsMessage);

import { Button } from '@/ui/actions/button';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { session as sessionRoute, withSiteId } from 'App/routes';
import { useNavigate } from 'App/routing';
import 'Components/Session/ReplayScreen/replay-timeline.css';

const COUNT_FROM = 5;

/** The corner countdown to the next session in the queue. */
function AutoplayTimer() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [cancelled, setCancelled] = useState(false);
  const [left, setLeft] = useState(COUNT_FROM);
  const { projectsStore, sessionStore } = useStore();
  const { nextId } = sessionStore;

  const playNow = () => {
    const { siteId } = projectsStore.getSiteId();
    navigate(withSiteId(sessionRoute(nextId), siteId));
  };

  useEffect(() => {
    if (cancelled) return undefined;
    if (left === 0) {
      playNow();
      return undefined;
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left, cancelled]);

  if (cancelled) return null;

  return (
    <div className="m-toast m-autoplay" role="status" aria-live="polite">
      <span className="m-autoplay__text">
        {t('Next session in')} <b className="m-mono">{left}s</b>
      </span>
      <span className="m-autoplay__actions">
        <Button variant="secondary" onClick={playNow} disabled={!nextId}>
          {t('Play now')}
        </Button>
        <Button variant="subtle" onClick={() => setCancelled(true)}>
          {t('Stop')}
        </Button>
      </span>
    </div>
  );
}

export default observer(AutoplayTimer);

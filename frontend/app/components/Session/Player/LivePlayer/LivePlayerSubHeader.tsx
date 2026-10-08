import { Tooltip } from '@/ui/overlays/tooltip';
import { Lock } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import SessionTabs from 'Components/Session/Player/SharedComponents/SessionTabs';

function SubHeader() {
  const { t } = useTranslation();
  const { store } = React.useContext(PlayerContext);
  const { location = '', tabs = [] } = store.get() as any;
  const multiTab = tabs.length > 1;
  return (
    <div className={`m-player__urlbar${multiTab ? ' has-tabs' : ''}`}>
      {multiTab && <SessionTabs isLive />}
      <span className="m-player__address">
        <Lock size={10} aria-hidden="true" />
        {location ? (
          <Tooltip title={t('Open in new tab')} side="bottom">
            <a
              href={location}
              target="_blank"
              rel="noreferrer"
              className="m-player__url m-mono m-truncate"
            >
              {location}
            </a>
          </Tooltip>
        ) : (
          <span className="m-player__url m-mono">{t('Loading…')}</span>
        )}
      </span>
    </div>
  );
}

export default observer(SubHeader);

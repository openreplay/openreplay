import { Tooltip } from '@/ui/overlays/tooltip';
import { Lock } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import SessionTabs from 'Components/Session/Player/SharedComponents/SessionTabs';

/** The recorded browser's address line, with its tabs when there are several. */
function SubHeader() {
  const { t } = useTranslation();
  const { store } = React.useContext(PlayerContext);
  const { location: currentLocation = '', tabs } = store.get();
  const multiTab = (tabs?.size ?? 0) > 1;

  return (
    <>
      <div className={`m-player__urlbar${multiTab ? ' has-tabs' : ''}`}>
        {multiTab && <SessionTabs />}
        <span className="m-player__address">
          <Lock size={10} aria-hidden="true" />
          {currentLocation ? (
            <Tooltip title={t('Open in new tab')} side="bottom">
              <a
                href={currentLocation}
                target="_blank"
                rel="noreferrer"
                className="m-player__url m-mono m-truncate"
              >
                {currentLocation}
              </a>
            </Tooltip>
          ) : (
            <span className="m-player__url m-mono">{t('loading…')}</span>
          )}
        </span>
      </div>
    </>
  );
}

export default observer(SubHeader);

import { Tooltip } from '@/ui/overlays/tooltip';
import { Lock } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import SessionTabs from 'Components/Session/Player/SharedComponents/SessionTabs';
import WarnBadge from 'Components/Session_/WarnBadge';

/** The recorded browser's address line, with its tabs when there are several. */
function SubHeader() {
  const { t } = useTranslation();
  const { sessionStore, projectsStore, settingsStore } = useStore();
  const { player, store } = React.useContext(PlayerContext);
  const session = sessionStore.current;
  const { location: currentLocation = '', tabs, vModeBadge } = store.get();
  const multiTab = (tabs?.size ?? 0) > 1;

  const onVMode = () => {
    settingsStore.sessionSettings.updateKey('virtualMode', true);
    player.enableVMode?.();
    location.reload();
  };

  return (
    <>
      <WarnBadge
        siteId={projectsStore.siteId!}
        currentLocation={currentLocation}
        version={session?.trackerVersion ?? ''}
        containerStyle={{
          position: 'relative',
          left: 0,
          top: 0,
          transform: 'none',
          zIndex: 10,
        }}
        trackerWarnStyle={{
          backgroundColor: 'var(--m-status-warning-bg)',
          color: 'var(--m-status-warning-fg)',
        }}
        virtualElsFailed={vModeBadge}
        onVMode={onVMode}
      />
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

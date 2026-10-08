import { Tooltip } from '@/ui/overlays/tooltip';
import { Lock } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import spotPlayerStore from '../spotPlayerStore';

function SpotLocation() {
  const { t } = useTranslation();
  const currUrl =
    spotPlayerStore.getClosestLocation(spotPlayerStore.time)?.location ?? '';
  return (
    <div className="m-player__urlbar">
      <span className="m-player__address">
        <Lock size={10} aria-hidden="true" />
        {currUrl ? (
          <Tooltip title={t('Open in new tab')} side="bottom">
            <a
              href={currUrl}
              target="_blank"
              rel="noreferrer"
              className="m-player__url m-mono m-truncate"
            >
              {currUrl}
            </a>
          </Tooltip>
        ) : null}
      </span>
    </div>
  );
}

export default observer(SpotLocation);

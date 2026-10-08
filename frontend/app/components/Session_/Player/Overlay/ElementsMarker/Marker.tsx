import { Tooltip } from '@/ui/overlays/tooltip';
import type { MarkedTarget } from 'Player';
import cn from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PlayerContext } from 'App/components/Session/playerContext';

import stl from './Marker.module.css';

interface Props {
  target: MarkedTarget;
  active: boolean;
}

export default function Marker({ target, active }: Props) {
  const { t } = useTranslation();
  const style = {
    top: `${target.boundingRect.top}px`,
    left: `${target.boundingRect.left}px`,
    width: `${target.boundingRect.width}px`,
    height: `${target.boundingRect.height}px`,
  };
  const { player } = React.useContext(PlayerContext);

  return (
    <div
      className={cn(stl.marker, { [stl.active]: active })}
      style={style}
      // @ts-ignore
      onClick={() => player.setActiveTarget(target.index)}
    >
      <div className={stl.index}>{target.index + 1}</div>
      <Tooltip
        open={active}
        delay={0}
        title={
          <div>
            {target.count}&nbsp;{t('Clicks')}
          </div>
        }
      >
        <div className="absolute inset-0" />
      </Tooltip>
    </div>
  );
}
